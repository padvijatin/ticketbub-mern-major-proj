import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../store/auth.jsx";
import { getSeatSocket } from "../utils/socketClient.js";

const uniqueSeatIds = (seatIds = []) => [...new Set((seatIds || []).map((seatId) => String(seatId).trim()).filter(Boolean))];

export const useSeatLocking = ({ event, maxSelectable = 10 }) => {
  const { authorizationToken, isLoggedIn, user } = useAuth();
  const [selectedSeatIds, setSelectedSeatIds] = useState(() => uniqueSeatIds(event?.currentUserLockedSeats));
  const [lockedSeatIds, setLockedSeatIds] = useState(() => uniqueSeatIds(event?.lockedSeats));
  const [bookedSeatIds, setBookedSeatIds] = useState(() => uniqueSeatIds(event?.bookedSeats));
  const [isSocketReady, setIsSocketReady] = useState(false);

  const currentUserId = user?._id || user?.id || "";
  const selectedSeatIdSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const bookedSeatIdSet = useMemo(() => new Set(bookedSeatIds), [bookedSeatIds]);
  const lockedByOtherSeatIds = useMemo(
    () => lockedSeatIds.filter((seatId) => !selectedSeatIdSet.has(seatId)),
    [lockedSeatIds, selectedSeatIdSet]
  );
  const lockedByOtherSeatIdSet = useMemo(() => new Set(lockedByOtherSeatIds), [lockedByOtherSeatIds]);

  useEffect(() => {
    setSelectedSeatIds(uniqueSeatIds(event?.currentUserLockedSeats));
    setLockedSeatIds(uniqueSeatIds(event?.lockedSeats));
    setBookedSeatIds(uniqueSeatIds(event?.bookedSeats));
  }, [event?.bookedSeats, event?.currentUserLockedSeats, event?.id, event?.lockedSeats]);

  useEffect(() => {
    if (!event?.id) {
      return undefined;
    }

    const socket = getSeatSocket(authorizationToken);

    const joinRoom = () => {
      socket.emit("join-event", { eventId: event.id }, (response = {}) => {
        if (!response.ok) {
          return;
        }

        setSelectedSeatIds(uniqueSeatIds(response.currentUserLockedSeats));
        setLockedSeatIds(uniqueSeatIds(response.lockedSeatIds));
        setIsSocketReady(true);
      });
    };

    const handleSeatLocked = ({ eventId, seatId, userId }) => {
      if (String(eventId) !== String(event.id) || !seatId) {
        return;
      }

      setLockedSeatIds((currentSeatIds) => uniqueSeatIds([...currentSeatIds, seatId]));

      if (String(userId || "") === String(currentUserId || "")) {
        setSelectedSeatIds((currentSeatIds) => uniqueSeatIds([...currentSeatIds, seatId]));
      }
    };

    const handleSeatReleased = ({ eventId, seatId }) => {
      if (String(eventId) !== String(event.id) || !seatId) {
        return;
      }

      setLockedSeatIds((currentSeatIds) => currentSeatIds.filter((currentSeatId) => currentSeatId !== seatId));
      setSelectedSeatIds((currentSeatIds) => currentSeatIds.filter((currentSeatId) => currentSeatId !== seatId));
    };

    const handleSeatBooked = ({ eventId, seatId }) => {
      if (String(eventId) !== String(event.id) || !seatId) {
        return;
      }

      setBookedSeatIds((currentSeatIds) => uniqueSeatIds([...currentSeatIds, seatId]));
      setLockedSeatIds((currentSeatIds) => currentSeatIds.filter((currentSeatId) => currentSeatId !== seatId));
      setSelectedSeatIds((currentSeatIds) => currentSeatIds.filter((currentSeatId) => currentSeatId !== seatId));
    };

    socket.on("connect", joinRoom);
    socket.on("seat-locked", handleSeatLocked);
    socket.on("seat-released", handleSeatReleased);
    socket.on("seat-booked", handleSeatBooked);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.off("seat-locked", handleSeatLocked);
      socket.off("seat-released", handleSeatReleased);
      socket.off("seat-booked", handleSeatBooked);
      setIsSocketReady(false);
    };
  }, [authorizationToken, currentUserId, event?.id]);

  const lockSeat = (seatId) => {
    if (!event?.id || !seatId) {
      return;
    }

    if (!isLoggedIn) {
      toast.info("Please login to lock seats before checkout");
      return;
    }

    if (selectedSeatIdSet.has(seatId)) {
      return;
    }

    if (bookedSeatIdSet.has(seatId) || lockedByOtherSeatIdSet.has(seatId)) {
      toast.error("This seat is no longer available");
      return;
    }

    if (selectedSeatIds.length >= maxSelectable) {
      toast.info(`You can select up to ${maxSelectable} tickets`);
      return;
    }

    const socket = getSeatSocket(authorizationToken);
    socket.emit("lock-seat", { eventId: event.id, seatId }, (response = {}) => {
      if (!response.ok) {
        toast.error(response.message || "Unable to lock this seat right now");
        return;
      }

      setSelectedSeatIds((currentSeatIds) => uniqueSeatIds([...currentSeatIds, seatId]));
      setLockedSeatIds((currentSeatIds) => uniqueSeatIds([...currentSeatIds, seatId]));
    });
  };

  const releaseSeat = (seatId) => {
    if (!event?.id || !seatId || !selectedSeatIdSet.has(seatId)) {
      return;
    }

    const socket = getSeatSocket(authorizationToken);
    socket.emit("release-seat", { eventId: event.id, seatId }, (response = {}) => {
      if (!response.ok) {
        toast.error("Unable to release this seat right now");
        return;
      }

      setSelectedSeatIds((currentSeatIds) => currentSeatIds.filter((currentSeatId) => currentSeatId !== seatId));
      setLockedSeatIds((currentSeatIds) => currentSeatIds.filter((currentSeatId) => currentSeatId !== seatId));
    });
  };

  const toggleSeat = (seatId) => {
    if (selectedSeatIdSet.has(seatId)) {
      releaseSeat(seatId);
      return;
    }

    lockSeat(seatId);
  };

  const clearSelection = () => {
    selectedSeatIds.forEach((seatId) => {
      releaseSeat(seatId);
    });
  };

  return {
    bookedSeatIds,
    bookedSeatIdSet,
    clearSelection,
    isSocketReady,
    lockedByOtherSeatIdSet,
    lockSeat,
    releaseSeat,
    selectedSeatIds,
    selectedSeatIdSet,
    toggleSeat,
  };
};
