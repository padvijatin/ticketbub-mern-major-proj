import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, ImagePlus, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../store/auth.jsx";
import PosterImage, { fallbackPosterImage, resolvePosterSource } from "../PosterImage.jsx";
import {
  createAdminEvent,
  deleteAdminEvent,
  getAdminEvents,
  updateAdminEvent,
} from "../../utils/adminApi.js";

const createSeatZone = () => ({
  sectionGroup: "",
  name: "",
  price: "",
  totalSeats: "",
  rows: "",
  seatsPerRow: "",
});

const categorySuggestions = [
  "Sports",
  "Movies",
  "Concert",
  "Comedy",
  "Theatre",
  "Festival",
  "Workshop",
];

const seatZonePresets = {
  sports: [
    { sectionGroup: "Pitch", name: "North Lower", price: "1499", totalSeats: "180", rows: "", seatsPerRow: "" },
    { sectionGroup: "Pitch", name: "East Stand", price: "1899", totalSeats: "220", rows: "", seatsPerRow: "" },
    { sectionGroup: "Pitch", name: "South Lower", price: "1699", totalSeats: "180", rows: "", seatsPerRow: "" },
    { sectionGroup: "Pitch", name: "West Premium", price: "2499", totalSeats: "140", rows: "", seatsPerRow: "" },
  ],
  movie: [
    { sectionGroup: "Screening", name: "Premium", price: "499", totalSeats: "", rows: "A, B", seatsPerRow: "12" },
    { sectionGroup: "Screening", name: "Classic", price: "349", totalSeats: "", rows: "C, D, E", seatsPerRow: "12" },
    { sectionGroup: "Screening", name: "Saver", price: "249", totalSeats: "", rows: "F, G", seatsPerRow: "12" },
  ],
  event: [
    { sectionGroup: "Stage", name: "Fan Pit", price: "2499", totalSeats: "160", rows: "", seatsPerRow: "" },
    { sectionGroup: "Stage", name: "Gold Circle", price: "1799", totalSeats: "220", rows: "", seatsPerRow: "" },
    { sectionGroup: "Stage", name: "Regular", price: "999", totalSeats: "260", rows: "", seatsPerRow: "" },
  ],
};

const getPresetTypeFromCategory = (categoryValue = "") => {
  const normalizedValue = String(categoryValue).trim().toLowerCase();
  if (!normalizedValue) return "event";
  if (/(movie|film|cinema)/i.test(normalizedValue)) return "movie";
  if (/(sport|cricket|football|match|league|ipl|cup|tournament|stadium)/i.test(normalizedValue)) return "sports";
  return "event";
};

const initialFormState = {
  title: "",
  category: "",
  description: "",
  aboutThisEvent: "",
  language: "",
  genres: "",
  format: "",
  tags: "",
  venue: "",
  address: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
  date: "",
  startTime: "",
  price: "",
  poster: "",
  posterFile: null,
  removePoster: false,
  status: "approved",
  isActive: true,
  seatZones: [createSeatZone()],
};

const toDateTimeLocalValue = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const eventToFormState = (event) => ({
  title: event.title || "",
  category: event.category || "",
  description: event.description || "",
  aboutThisEvent: event.aboutThisEvent || "",
  language: (event.language || []).join(", "),
  genres: (event.genres || []).join(", "),
  format: (event.format || []).join(", "),
  tags: (event.tags || []).join(", "),
  venue: event.venue || "",
  address: event.address || "",
  city: event.city || "",
  state: event.state || "",
  latitude: event.latitude ?? "",
  longitude: event.longitude ?? "",
  date: toDateTimeLocalValue(event.date),
  startTime: event.startTime || "",
  price: event.price || "",
  poster: event.poster || "",
  posterFile: null,
  removePoster: false,
  status: event.status || "approved",
  isActive: event.isActive ?? true,
  seatZones: (event.seatZones || []).length
    ? event.seatZones.map((zone) => ({
        sectionGroup: zone.sectionGroup || "",
        name: zone.name || "",
        price: zone.price || "",
        totalSeats: zone.totalSeats || "",
        rows: (zone.rows || []).join(", "),
        seatsPerRow: zone.seatsPerRow || "",
      }))
    : [createSeatZone()],
});

const buildPayload = (formState, role) => ({
  title: formState.title.trim(),
  category: formState.category.trim(),
  description: formState.description.trim(),
  aboutThisEvent: formState.aboutThisEvent.trim(),
  language: formState.language,
  genres: formState.genres,
  format: formState.format,
  tags: formState.tags,
  venue: formState.venue.trim(),
  address: formState.address.trim(),
  city: formState.city.trim(),
  state: formState.state.trim(),
  latitude: formState.latitude,
  longitude: formState.longitude,
  date: formState.date ? new Date(formState.date).toISOString() : "",
  startTime: formState.startTime.trim(),
  price: Number(formState.price || 0),
  posterUrl: formState.poster.trim(),
  posterFile: formState.posterFile,
  removePoster: formState.removePoster,
  status: role === "admin" ? formState.status : undefined,
  isActive: formState.isActive,
  seatZones: formState.seatZones
    .map((zone) => ({
      sectionGroup: zone.sectionGroup.trim(),
      name: zone.name.trim(),
      price: Number(zone.price || 0),
      totalSeats: Number(zone.totalSeats || 0),
      rows: zone.rows
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
      seatsPerRow: Number(zone.seatsPerRow || 0),
    }))
    .filter(
      (zone) =>
        zone.name &&
        zone.price > 0 &&
        ((zone.rows.length && zone.seatsPerRow > 0) || zone.totalSeats > 0)
    ),
});

const formInputClassName = "h-[4.6rem] rounded-[1.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.2rem] text-[1.35rem] outline-none";
const requiredFieldLabelClassName = "after:ml-[0.25rem] after:text-[var(--color-error)] after:content-['*']";
const formTextareaClassName = "rounded-[1.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.2rem] py-[1rem] text-[1.35rem] outline-none";
const categoryChipClassName = "inline-flex rounded-full bg-[rgba(28,28,28,0.06)] px-[0.95rem] py-[0.38rem] text-[1.15rem] font-semibold text-[var(--color-text-primary)]";

const parseNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidEventDate = (value) => {
  const parsedDate = new Date(value);
  return !Number.isNaN(parsedDate.getTime());
};

const validateFormState = (formState) => {
  const globalErrors = [];
  const fieldErrors = {};
  const seatZoneErrors = {};
  const normalizedTitle = formState.title.trim();
  const normalizedCategory = formState.category.trim();
  const normalizedVenue = formState.venue.trim();
  const normalizedCity = formState.city.trim();
  const normalizedPrice = Number(formState.price || 0);
  const latitude = parseNumberOrNull(formState.latitude);
  const longitude = parseNumberOrNull(formState.longitude);

  if (!normalizedTitle) fieldErrors.title = "Title is required.";
  if (!normalizedCategory) fieldErrors.category = "Category is required.";
  if (!normalizedVenue) fieldErrors.venue = "Venue is required.";
  if (!normalizedCity) fieldErrors.city = "City is required.";

  if (!formState.date || !isValidEventDate(formState.date)) {
    fieldErrors.date = "Please provide a valid date and time.";
  }

  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    fieldErrors.price = "Starting price must be greater than 0.";
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    fieldErrors.latitude = "Latitude must be between -90 and 90.";
  }

  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    fieldErrors.longitude = "Longitude must be between -180 and 180.";
  }

  const normalizedZones = formState.seatZones.map((zone, zoneIndex) => {
      const rows = zone.rows
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);
      const seatsPerRow = Number(zone.seatsPerRow || 0);
      const totalSeats = Number(zone.totalSeats || 0);
      const zonePrice = Number(zone.price || 0);
      const zoneName = zone.name.trim();

      const zoneError = {};

      if (!zoneName) zoneError.name = "Zone name is required.";
      if (!Number.isFinite(zonePrice) || zonePrice <= 0) zoneError.price = "Zone price must be greater than 0.";
      if (rows.length > 0 && (!Number.isFinite(seatsPerRow) || seatsPerRow <= 0)) {
        zoneError.seatsPerRow = "Seats per row must be greater than 0 when rows are set.";
      }
      if ((!rows.length || !seatsPerRow) && (!Number.isFinite(totalSeats) || totalSeats <= 0)) {
        zoneError.totalSeats = "Add total seats or complete rows + seats per row.";
      }

      if (Object.keys(zoneError).length) {
        seatZoneErrors[zoneIndex] = zoneError;
      }

      return {
        zoneIndex,
        zoneName,
        zonePrice,
        rows,
        seatsPerRow,
        totalSeats,
        isValid: Boolean(
          zoneName &&
            zonePrice > 0 &&
            ((rows.length > 0 && seatsPerRow > 0) || totalSeats > 0)
        ),
      };
    });

  const validSeatZones = normalizedZones.filter((zone) => zone.isValid);

  if (!validSeatZones.length) {
    globalErrors.push("Add at least one valid seat zone with price and seat capacity.");
  }

  const zoneNames = validSeatZones.map((zone) => zone.zoneName.toLowerCase());
  if (new Set(zoneNames).size !== zoneNames.length) {
    globalErrors.push("Seat zone names must be unique.");
  }

  return {
    globalErrors,
    fieldErrors,
    seatZoneErrors,
  };
};

const requiredFieldSet = new Set(["title", "category", "venue", "city", "date", "price"]);

const EventManagement = ({ role }) => {
  const queryClient = useQueryClient();
  const { authorizationToken } = useAuth();
  const [formState, setFormState] = useState(initialFormState);
  const [editingEventId, setEditingEventId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [previewEvent, setPreviewEvent] = useState(null);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [formErrors, setFormErrors] = useState({
    globalErrors: [],
    fieldErrors: {},
    seatZoneErrors: {},
  });
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["admin-events", authorizationToken, role],
    queryFn: () => getAdminEvents(authorizationToken),
    enabled: Boolean(authorizationToken),
  });

  const mergeEventIntoCache = (nextEvent) => {
    if (!nextEvent) {
      return;
    }

    queryClient.setQueryData(["admin-events", authorizationToken, role], (currentEvents = []) => {
      const normalizedEvents = Array.isArray(currentEvents) ? currentEvents : [];
      const existingIndex = normalizedEvents.findIndex((event) => event.id === nextEvent.id);

      if (existingIndex < 0) {
        return [nextEvent, ...normalizedEvents];
      }

      return normalizedEvents.map((event) => (event.id === nextEvent.id ? nextEvent : event));
    });
  };

  const posterPreview = useMemo(() => {
    if (formState.posterFile instanceof File) {
      return URL.createObjectURL(formState.posterFile);
    }

    return formState.removePoster ? "" : formState.poster;
  }, [formState.poster, formState.posterFile, formState.removePoster]);

  useEffect(() => () => {
    if (posterPreview && posterPreview.startsWith("blob:")) {
      URL.revokeObjectURL(posterPreview);
    }
  }, [posterPreview]);

  const resetForm = () => {
    setFormState(initialFormState);
    setFormErrors({
      globalErrors: [],
      fieldErrors: {},
      seatZoneErrors: {},
    });
    setIsSubmitAttempted(false);
    setEditingEventId("");
    setIsFormOpen(false);
  };

  const invalidateManagementQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["event"] });
    queryClient.invalidateQueries({ queryKey: ["related-events"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => createAdminEvent({ authorizationToken, payload }),
    onSuccess: (createdEvent) => {
      mergeEventIntoCache(createdEvent);
      setImageLoadErrors({});
      setPreviewEvent(null);
      toast.success(role === "admin" ? "Event created successfully" : "Event submitted successfully");
      invalidateManagementQueries();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Unable to create event right now");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, payload }) => updateAdminEvent({ authorizationToken, eventId, payload }),
    onSuccess: (updatedEvent) => {
      mergeEventIntoCache(updatedEvent);
      setImageLoadErrors({});
      setPreviewEvent((currentPreview) => (currentPreview?.id === updatedEvent?.id ? updatedEvent : null));
      toast.success("Event updated successfully");
      invalidateManagementQueries();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Unable to update event right now");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ eventId, status }) =>
      updateAdminEvent({
        authorizationToken,
        eventId,
        payload: {
          status,
          isActive: status === "approved",
        },
      }),
    onSuccess: (updatedEvent, variables) => {
      mergeEventIntoCache(updatedEvent);
      toast.success(variables.status === "approved" ? "Event approved successfully" : "Event rejected");
      invalidateManagementQueries();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Unable to update event status right now");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId) => deleteAdminEvent({ authorizationToken, eventId }),
    onSuccess: () => {
      toast.success("Event archived successfully");
      invalidateManagementQueries();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Unable to archive event right now");
    },
  });

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime()),
    [events]
  );

  const categoryOptions = useMemo(() => {
    const categories = [...new Set(sortedEvents.map((event) => String(event.category || "").trim()).filter(Boolean))];
    return ["All", ...categories];
  }, [sortedEvents]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    return sortedEvents.filter((event) => {
      const matchesCategory =
        categoryFilter === "All" ||
        String(event.category || "").trim().toLowerCase() === categoryFilter.toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        [
          event.title,
          event.category,
          event.venue,
          event.city,
          event.state,
          event.organizer?.username,
          event.organizer?.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, searchValue, sortedEvents]);

  const handleEdit = (event) => {
    setEditingEventId(event.id);
    setImageLoadErrors((current) => {
      if (!current[event.id]) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[event.id];
      return nextState;
    });
    setFormState(eventToFormState(event));
    setFormErrors({
      globalErrors: [],
      fieldErrors: {},
      seatZoneErrors: {},
    });
    setIsSubmitAttempted(false);
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    setFormErrors(validateFormState(formState));
  }, [formState, isFormOpen]);

  const getPosterSrc = (event) => {
    if (!event) return fallbackPosterImage;
    return imageLoadErrors[event.id] ? fallbackPosterImage : resolvePosterSource(event.poster);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitAttempted(true);
    const validationResult = validateFormState(formState);
    setFormErrors(validationResult);

    if (
      validationResult.globalErrors.length ||
      Object.keys(validationResult.fieldErrors).length ||
      Object.keys(validationResult.seatZoneErrors).length
    ) {
      toast.error(validationResult.globalErrors[0] || Object.values(validationResult.fieldErrors)[0] || "Please fix highlighted form errors.");
      return;
    }

    const payload = buildPayload(formState, role);

    if (editingEventId) {
      updateMutation.mutate({ eventId: editingEventId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const heading = role === "admin" ? "Event Management" : "My Events";

  const formatEventDate = (value) => {
    if (!value) return "-";

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "-";

    return parsedDate.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const applySeatZonePreset = (presetType) => {
    const selectedPreset = seatZonePresets[presetType] || seatZonePresets.event;
    setFormState((current) => ({
      ...current,
      seatZones: selectedPreset.map((zone) => ({ ...zone })),
    }));
  };

  return (
    <div className="space-y-[2rem]">
      <div>
        <h1 className="text-[2.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">{heading}</h1>
        <p className="mt-[0.45rem] text-[1.45rem] text-[var(--color-text-secondary)]">
          {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
        </p>
      </div>

      <div className="space-y-[1.6rem]">
        <div className="flex flex-wrap items-center justify-between gap-[1rem]">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[0.8rem]">
            <label className="relative min-w-[28rem] flex-1 max-w-[46rem]">
              <Search className="pointer-events-none absolute left-[1.5rem] top-1/2 h-[1.8rem] w-[1.8rem] -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                value={searchValue}
                onChange={(eventObject) => setSearchValue(eventObject.target.value)}
                placeholder="Search events..."
                className="h-[4.8rem] w-full rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white pl-[4.6rem] pr-[1.4rem] text-[1.45rem] text-[var(--color-text-primary)] outline-none shadow-[0_12px_30px_rgba(28,28,28,0.04)]"
              />
            </label>

            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`rounded-full border px-[1.4rem] py-[0.9rem] text-[1.3rem] font-semibold transition-colors duration-200 ${
                  categoryFilter === category
                    ? "border-[rgba(248,68,100,0.18)] bg-[var(--color-primary)] text-white"
                    : "border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isFormOpen && !editingEventId) {
                resetForm();
                return;
              }

              setEditingEventId("");
              setFormState(initialFormState);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-[0.6rem] rounded-[1.45rem] bg-[var(--color-primary)] px-[1.7rem] py-[1rem] text-[1.35rem] font-semibold text-white"
          >
            {isFormOpen && !editingEventId ? <X className="h-[1.6rem] w-[1.6rem]" /> : <Plus className="h-[1.6rem] w-[1.6rem]" />}
            {isFormOpen && !editingEventId ? "Close" : "Create Event"}
          </button>
        </div>

        {isFormOpen ? (
          <form onSubmit={handleSubmit} className="space-y-[1.6rem] rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.8rem] shadow-[0_16px_36px_rgba(28,28,28,0.06)]">
            <div className="grid gap-[1.2rem] md:grid-cols-2 xl:grid-cols-3">
              {[
                ["title", "Title"],
                ["venue", "Venue"],
                ["address", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["latitude", "Latitude", "number"],
                ["longitude", "Longitude", "number"],
                ["date", "Date & Time", "datetime-local"],
                ["startTime", "Start Time"],
                ["price", "Starting Price", "number"],
                ["language", "Languages (comma separated)"],
                ["genres", "Genres (comma separated)"],
                ["format", "Formats (comma separated)"],
                ["tags", "Tags (comma separated)"],
              ].map(([field, label, type]) => (
                <label key={field} className="grid gap-[0.5rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                  <span className={requiredFieldSet.has(field) ? requiredFieldLabelClassName : ""}>{label}</span>
                  <input
                    type={type || "text"}
                    value={formState[field]}
                    onChange={(eventObject) => setFormState((current) => ({ ...current, [field]: eventObject.target.value }))}
                    min={field === "price" || field === "seatsPerRow" || field === "totalSeats" ? 0 : undefined}
                    step={field === "latitude" || field === "longitude" ? "any" : undefined}
                    className={formInputClassName}
                  />
                  {isSubmitAttempted && formErrors.fieldErrors[field] ? (
                    <span className="text-[1.1rem] font-medium text-[var(--color-error)]">{formErrors.fieldErrors[field]}</span>
                  ) : null}
                </label>
              ))}

              <label className="grid gap-[0.5rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                <span className={requiredFieldLabelClassName}>Category</span>
                <input
                  type="text"
                  list="event-category-suggestions"
                  value={formState.category}
                  onChange={(eventObject) => setFormState((current) => ({ ...current, category: eventObject.target.value }))}
                  className={formInputClassName}
                />
                <datalist id="event-category-suggestions">
                  {categorySuggestions.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption} />
                  ))}
                </datalist>
                {isSubmitAttempted && formErrors.fieldErrors.category ? (
                  <span className="text-[1.1rem] font-medium text-[var(--color-error)]">{formErrors.fieldErrors.category}</span>
                ) : null}
              </label>

              {role === "admin" ? (
                <label className="grid gap-[0.5rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                  Status
                  <select
                    value={formState.status}
                    onChange={(eventObject) => setFormState((current) => ({ ...current, status: eventObject.target.value }))}
                    className={formInputClassName}
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
              ) : (
                <div className="grid gap-[0.5rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                  Submission Status
                  <div className="flex h-[4.6rem] items-center rounded-[1.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.2rem] text-[1.3rem] text-[var(--color-text-secondary)]">
                    Organizer submissions are saved as pending until reviewed by admin.
                  </div>
                </div>
              )}

              {role === "admin" ? (
                <label className="grid gap-[0.65rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                  Active Listing
                  <select
                    value={formState.isActive ? "true" : "false"}
                    onChange={(eventObject) => setFormState((current) => ({ ...current, isActive: eventObject.target.value === "true" }))}
                    className={formInputClassName}
                  >
                    <option value="true">Active</option>
                    <option value="false">Archived</option>
                  </select>
                </label>
              ) : (
                <div className="grid gap-[0.5rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                  Listing Visibility
                  <div className="flex h-[4.6rem] items-center rounded-[1.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.2rem] text-[1.3rem] text-[var(--color-text-secondary)]">
                    Organizer events stay inactive until admin approval.
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-[1.2rem] lg:grid-cols-[minmax(0,1.2fr)_28rem]">
              <div className="grid gap-[1.2rem]">
                <label className="grid gap-[0.5rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                  Description
                  <textarea
                    rows="4"
                    value={formState.description}
                    onChange={(eventObject) => setFormState((current) => ({ ...current, description: eventObject.target.value }))}
                    className={formTextareaClassName}
                  />
                </label>
                <label className="grid gap-[0.5rem] text-[1.25rem] font-semibold text-[var(--color-text-primary)]">
                  About This Event
                  <textarea
                    rows="6"
                    value={formState.aboutThisEvent}
                    onChange={(eventObject) => setFormState((current) => ({ ...current, aboutThisEvent: eventObject.target.value }))}
                    className={formTextareaClassName}
                  />
                </label>
              </div>

              <div className="rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.2rem]">
                <div className="flex items-center gap-[0.7rem] text-[1.3rem] font-bold text-[var(--color-text-primary)]">
                  <ImagePlus className="h-[1.7rem] w-[1.7rem] text-[var(--color-primary)]" />
                  Poster Upload
                </div>
                <label className="mt-[1rem] grid gap-[0.5rem] text-[1.15rem] font-semibold text-[var(--color-text-primary)]">
                  Poster URL
                  <input
                    type="text"
                    value={formState.poster}
                    onChange={(eventObject) => setFormState((current) => ({ ...current, poster: eventObject.target.value, removePoster: false }))}
                    className={formInputClassName}
                  />
                </label>
                <label className="mt-[1rem] flex h-[4.6rem] cursor-pointer items-center justify-center gap-[0.6rem] rounded-[1.2rem] border border-dashed border-[rgba(28,28,28,0.18)] bg-[rgba(28,28,28,0.02)] text-[1.2rem] font-semibold text-[var(--color-text-primary)]">
                  <Upload className="h-[1.6rem] w-[1.6rem]" />
                  Upload poster image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(eventObject) => {
                      const nextFile = eventObject.target.files?.[0] || null;
                      setFormState((current) => ({ ...current, posterFile: nextFile, removePoster: false }));
                    }}
                  />
                </label>
                <label className="mt-[1rem] flex items-center gap-[0.7rem] text-[1.15rem] text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={formState.removePoster}
                    onChange={(eventObject) =>
                      setFormState((current) => ({
                        ...current,
                        poster: eventObject.target.checked ? "" : current.poster,
                        removePoster: eventObject.target.checked,
                        posterFile: eventObject.target.checked ? null : current.posterFile,
                      }))
                    }
                  />
                  Remove current poster
                </label>
                <div className="mt-[1rem] overflow-hidden rounded-[1.2rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.02)]">
                  <PosterImage
                    src={posterPreview}
                    alt={posterPreview ? "Poster preview" : "Poster fallback preview"}
                    className="h-[20rem] w-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.2rem]">
              <div className="mb-[1rem] flex items-center justify-between gap-[1rem]">
                <div>
                  <h3 className="text-[1.5rem] font-bold text-[var(--color-text-primary)]">Seat Zones</h3>
                  <p className="mt-[0.35rem] text-[1.15rem] text-[var(--color-text-secondary)]">
                    Add each section with price and capacity. Use open seating (`totalSeats`) or row-based layout (`rows + seatsPerRow`).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-[0.6rem]">
                  <button
                    type="button"
                    onClick={() => applySeatZonePreset(getPresetTypeFromCategory(formState.category))}
                    className="inline-flex items-center gap-[0.5rem] rounded-[1rem] border border-[rgba(28,28,28,0.08)] px-[1rem] py-[0.7rem] text-[1.15rem] font-semibold text-[var(--color-text-primary)]"
                  >
                    Use Suggested Layout
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState((current) => ({ ...current, seatZones: [...current.seatZones, createSeatZone()] }))}
                    className="inline-flex items-center gap-[0.5rem] rounded-[1rem] border border-[rgba(28,28,28,0.08)] px-[1rem] py-[0.7rem] text-[1.15rem] font-semibold text-[var(--color-text-primary)]"
                  >
                    <Plus className="h-[1.4rem] w-[1.4rem]" /> Add zone
                  </button>
                </div>
              </div>

              <div className="space-y-[1rem]">
                {isSubmitAttempted && formErrors.globalErrors.length ? (
                  <div className="rounded-[1rem] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] px-[1rem] py-[0.8rem] text-[1.15rem] font-medium text-[var(--color-error)]">
                    {formErrors.globalErrors[0]}
                  </div>
                ) : null}
                {formState.seatZones.map((zone, zoneIndex) => (
                  <div key={`${zoneIndex}-${zone.name}`} className="grid gap-[1rem] rounded-[1.2rem] border border-[rgba(28,28,28,0.08)] p-[1rem] md:grid-cols-2 xl:grid-cols-6">
                    {[
                      ["sectionGroup", "Group"],
                      ["name", "Zone Name"],
                      ["price", "Zone Price", "number"],
                      ["totalSeats", "Total Seats (for open seating)", "number"],
                      ["rows", "Rows (comma separated)"],
                      ["seatsPerRow", "Seats / Row", "number"],
                    ].map(([field, label, type]) => (
                      <label key={field} className="grid gap-[0.4rem] text-[1.15rem] font-semibold text-[var(--color-text-primary)]">
                        <span className={field === "name" || field === "price" ? requiredFieldLabelClassName : ""}>{label}</span>
                        <input
                          type={type || "text"}
                          value={zone[field]}
                          onChange={(eventObject) =>
                            setFormState((current) => ({
                              ...current,
                              seatZones: current.seatZones.map((item, index) =>
                                index === zoneIndex ? { ...item, [field]: eventObject.target.value } : item
                              ),
                            }))
                          }
                          min={field === "price" || field === "seatsPerRow" || field === "totalSeats" ? 0 : undefined}
                          className={formInputClassName}
                        />
                        {isSubmitAttempted && formErrors.seatZoneErrors[zoneIndex]?.[field] ? (
                          <span className="text-[1.05rem] font-medium text-[var(--color-error)]">
                            {formErrors.seatZoneErrors[zoneIndex][field]}
                          </span>
                        ) : null}
                      </label>
                    ))}
                    <div className="flex items-end justify-end md:col-span-2 xl:col-span-6">
                      <button
                        type="button"
                        onClick={() =>
                          setFormState((current) => ({
                            ...current,
                            seatZones: current.seatZones.length === 1 ? [createSeatZone()] : current.seatZones.filter((_, index) => index !== zoneIndex),
                          }))
                        }
                        className="inline-flex items-center gap-[0.45rem] rounded-[1rem] border border-[rgba(239,68,68,0.16)] px-[1rem] py-[0.7rem] text-[1.15rem] font-semibold text-[var(--color-error)]"
                      >
                        <Trash2 className="h-[1.4rem] w-[1.4rem]" /> Remove zone
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-[1rem]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-[1.2rem] bg-[var(--color-primary)] px-[1.6rem] py-[1rem] text-[1.3rem] font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : editingEventId ? "Update Event" : role === "admin" ? "Create Event" : "Submit Event"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-[1.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.6rem] py-[1rem] text-[1.3rem] font-semibold text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {isLoading ? (
          <div className="rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] text-[1.45rem] text-[var(--color-text-secondary)] shadow-[0_16px_36px_rgba(28,28,28,0.06)]">
            Loading events...
          </div>
        ) : isError ? (
          <div className="rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] text-[1.45rem] text-[var(--color-text-secondary)] shadow-[0_16px_36px_rgba(28,28,28,0.06)]">
            Unable to load events right now.
          </div>
        ) : filteredEvents.length ? (
          <div className="space-y-[1.6rem]">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.8rem] shadow-[0_16px_36px_rgba(28,28,28,0.06)]"
              >
                <div className="flex flex-col gap-[1.4rem] lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-[1.6rem]">
                    <div className="h-[7.8rem] w-[11.6rem] shrink-0 overflow-hidden rounded-[1.4rem] bg-[rgba(28,28,28,0.04)]">
                      <PosterImage
                        src={getPosterSrc(event)}
                        alt={event.title}
                        className="h-full w-full object-cover"
                        onError={() =>
                          setImageLoadErrors((current) => ({
                            ...current,
                            [event.id]: true,
                          }))
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-[0.8rem]">
                        <h2 className="text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                          {event.title}
                        </h2>
                        <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.12)] px-[1rem] py-[0.45rem] text-[1.15rem] font-semibold text-[var(--color-primary)]">
                          {event.status === "approved" ? "Published" : event.status}
                        </span>
                        {role === "organizer" && event.status === "pending" ? (
                          <span className="inline-flex rounded-full bg-[rgba(245,158,11,0.16)] px-[1rem] py-[0.45rem] text-[1.15rem] font-semibold text-[rgb(146,64,14)]">
                            Pending Approval
                          </span>
                        ) : null}
                        {!event.isActive ? (
                          <span className="inline-flex rounded-full bg-[rgba(28,28,28,0.08)] px-[1rem] py-[0.45rem] text-[1.15rem] font-semibold text-[var(--color-text-secondary)]">
                            Archived
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-[0.45rem] text-[1.35rem] text-[var(--color-text-secondary)]">
                        {formatEventDate(event.date)} | {event.venue}, {event.city}
                      </p>

                      <div className="mt-[0.8rem] flex flex-wrap items-center gap-[0.8rem]">
                        <span className={categoryChipClassName}>{event.category}</span>
                        <span className="text-[1.25rem] text-[var(--color-text-secondary)]">
                          Capacity: {event.totalSeats || 0}
                        </span>
                        <span className="text-[1.25rem] text-[var(--color-text-secondary)]">
                          Available: {event.availableSeats || 0}
                        </span>
                        <span className="text-[1.25rem] text-[var(--color-text-secondary)]">
                          Booked: {Math.max(0, Number(event.totalSeats || 0) - Number(event.availableSeats || 0))}
                        </span>
                        {role === "admin" && event.organizer ? (
                          <span className="text-[1.25rem] text-[var(--color-text-secondary)]">
                            Organizer: {event.organizer.username || event.organizer.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-[1.2rem] lg:justify-end">
                    <p className="text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                      Rs {Number(event.price || 0).toLocaleString("en-IN")}
                    </p>

                    <div className="flex items-center gap-[0.5rem]">
                      {role === "admin" && event.status !== "approved" ? (
                        <button
                          type="button"
                          onClick={() => updateStatusMutation.mutate({ eventId: event.id, status: "approved" })}
                          disabled={updateStatusMutation.isPending}
                          className="rounded-[0.9rem] border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.12)] px-[0.9rem] py-[0.45rem] text-[1.15rem] font-semibold text-[rgb(21,128,61)] disabled:opacity-60"
                        >
                          Approve
                        </button>
                      ) : null}
                      {role === "admin" && event.status !== "rejected" ? (
                        <button
                          type="button"
                          onClick={() => updateStatusMutation.mutate({ eventId: event.id, status: "rejected" })}
                          disabled={updateStatusMutation.isPending}
                          className="rounded-[0.9rem] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] px-[0.9rem] py-[0.45rem] text-[1.15rem] font-semibold text-[rgb(185,28,28)] disabled:opacity-60"
                        >
                          Reject
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPreviewEvent(event)}
                        className="inline-flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(28,28,28,0.04)]"
                        aria-label={`View ${event.title}`}
                      >
                        <Eye className="h-[1.7rem] w-[1.7rem]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(event)}
                        className="inline-flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(28,28,28,0.04)]"
                        aria-label={`Edit ${event.title}`}
                      >
                        <Pencil className="h-[1.7rem] w-[1.7rem]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(event.id)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-full text-[var(--color-error)] transition-colors hover:bg-[rgba(239,68,68,0.08)] disabled:opacity-60"
                        aria-label={`Archive ${event.title}`}
                      >
                        <Trash2 className="h-[1.7rem] w-[1.7rem]" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] text-[1.45rem] text-[var(--color-text-secondary)] shadow-[0_16px_36px_rgba(28,28,28,0.06)]">
            No events match this search right now.
          </div>
        )}
      </div>

      {previewEvent ? (
        <div className="fixed inset-0 z-[1300] overflow-y-auto bg-[rgba(28,28,28,0.35)] px-[1.2rem] py-[1.6rem] md:px-[1.6rem] md:py-[4rem]" onClick={() => setPreviewEvent(null)}>
          <div className="flex min-h-full items-center justify-center">
            <div
              className="max-h-[calc(100vh-3.2rem)] w-full max-w-[72rem] overflow-y-auto rounded-[2.2rem] bg-white p-[1.6rem] shadow-[0_24px_54px_rgba(28,28,28,0.18)] md:p-[2.4rem]"
              onClick={(eventObject) => eventObject.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-[1rem]">
                <h3 className="text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">Event Details</h3>
                <button
                  type="button"
                  onClick={() => setPreviewEvent(null)}
                  className="inline-flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-full border border-[rgba(248,68,100,0.18)] text-[var(--color-text-secondary)] transition-all duration-150 hover:bg-[rgba(248,68,100,0.08)] hover:text-[var(--color-primary)] active:scale-[0.94] active:border-[rgba(248,68,100,0.32)]"
                >
                  <X className="h-[1.7rem] w-[1.7rem]" />
                </button>
              </div>

              <div className="mt-[1.6rem] overflow-hidden rounded-[1.8rem] bg-[rgba(28,28,28,0.04)]">
                <PosterImage
                  src={getPosterSrc(previewEvent)}
                  alt={previewEvent.title}
                  className="h-[16rem] w-full object-cover sm:h-[18rem] md:h-[20rem]"
                  onError={() =>
                    setImageLoadErrors((current) => ({
                      ...current,
                      [previewEvent.id]: true,
                    }))
                  }
                />
              </div>

              <div className="mt-[1.8rem] flex flex-wrap items-center gap-[0.9rem]">
                <h4 className="text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">{previewEvent.title}</h4>
                <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.12)] px-[1rem] py-[0.45rem] text-[1.15rem] font-semibold text-[var(--color-primary)]">
                  {previewEvent.status === "approved" ? "Published" : previewEvent.status}
                </span>
              </div>

              <p className="mt-[0.7rem] text-[1.45rem] leading-[1.65] text-[var(--color-text-secondary)]">
                {previewEvent.description || "No description provided."}
              </p>

              <div className="mt-[2.2rem] grid gap-[2rem] sm:grid-cols-2">
                {[
                  ["Category", previewEvent.category || "-"],
                  ["Price", `Rs ${Number(previewEvent.price || 0).toLocaleString("en-IN")}`],
                  ["Date", previewEvent.date ? new Date(previewEvent.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "-"],
                  ["Time", previewEvent.startTime || (previewEvent.date ? new Date(previewEvent.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "-")],
                  ["Venue", previewEvent.venue || "-"],
                  ["City", previewEvent.city || "-"],
                  ["Capacity", String(previewEvent.totalSeats || 0)],
                  ["Available Seats", String(previewEvent.availableSeats || 0)],
                  ["Booked Seats", String(Math.max(0, Number(previewEvent.totalSeats || 0) - Number(previewEvent.availableSeats || 0)))],
                  ["Organizer", previewEvent.organizer?.username || previewEvent.organizer?.email || "TicketHub"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[1.3rem] text-[var(--color-text-secondary)]">{label}</p>
                    <p className="mt-[0.35rem] text-[1.7rem] leading-[1.35] text-[var(--color-text-primary)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EventManagement;
