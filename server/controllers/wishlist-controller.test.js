const User = require("../models/user-model");
const Event = require("../models/event-model");
const Wishlist = require("../models/wishlist-model");
const wishlistController = require("./wishlist-controller");

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
});

describe("wishlist controller recommendation tracking", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks interest signals when a wishlist item is added", async () => {
    vi.spyOn(Event, "findOne").mockResolvedValue({
      _id: "event-1",
      category: "Movie",
      city: "Mumbai",
      isActive: true,
      status: "approved",
    });
    vi.spyOn(Wishlist, "findOneAndUpdate").mockResolvedValue({
      _id: "wishlist-1",
    });
    vi.spyOn(Wishlist, "countDocuments").mockResolvedValue(1);
    const updateSpy = vi.spyOn(User, "updateOne").mockResolvedValue({
      acknowledged: true,
    });
    const req = {
      body: {
        eventId: "event-1",
      },
      user: {
        _id: "user-1",
      },
    };
    const res = createResponse();

    await wishlistController.addWishlistItem(req, res);

    expect(updateSpy).toHaveBeenCalledWith(
      { _id: "user-1" },
      expect.objectContaining({
        $inc: expect.objectContaining({
          "interestSignals.categoryScores.movie": 2,
          "interestSignals.cityScores.mumbai": 2,
          "interestSignals.contentTypeScores.movie": 2,
        }),
        $set: expect.objectContaining({
          "interestSignals.lastInteractedAt": expect.any(Date),
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Added to wishlist",
      isWishlisted: true,
      count: 1,
    });
  });

  it("tracks interest signals for synced wishlist items", async () => {
    vi.spyOn(Event, "find").mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { _id: "event-1", category: "Movie", city: "Mumbai", isActive: true, status: "approved" },
        { _id: "event-2", category: "Cricket", city: "Delhi", isActive: true, status: "approved" },
      ]),
    });
    vi.spyOn(Wishlist, "bulkWrite").mockResolvedValue({});
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });
    vi.spyOn(Wishlist, "find").mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    });
    vi.spyOn(Wishlist, "deleteMany").mockResolvedValue({});
    const updateSpy = vi.spyOn(User, "updateOne").mockResolvedValue({
      acknowledged: true,
    });
    const req = {
      body: {
        eventIds: ["event-1", "event-2", "event-1"],
      },
      user: {
        _id: "user-1",
      },
    };
    const res = createResponse();

    await wishlistController.syncWishlist(req, res);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenNthCalledWith(
      1,
      { _id: "user-1" },
      expect.objectContaining({
        $inc: expect.objectContaining({
          "interestSignals.categoryScores.movie": 1,
          "interestSignals.cityScores.mumbai": 1,
          "interestSignals.contentTypeScores.movie": 1,
        }),
      })
    );
    expect(updateSpy).toHaveBeenNthCalledWith(
      2,
      { _id: "user-1" },
      expect.objectContaining({
        $inc: expect.objectContaining({
          "interestSignals.categoryScores.cricket": 1,
          "interestSignals.cityScores.delhi": 1,
          "interestSignals.contentTypeScores.sports": 1,
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [],
      count: 0,
    });
  });
});
