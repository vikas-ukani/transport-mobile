import { Router } from "express";
import { getMe } from "../../controllers/authController.js";
import {
    cancelBookingById,
    createBooking,
    deleteBooking,
    getBidsForBooking,
    getBookingById,
    getDriverRides,
    getMyBookings,
    placeBookingBid,
} from "../../controllers/bookingController.js";
import {
    getNotificationsByUserId,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../../controllers/notificationController.js";
import {
    createPost,
    createPostPayOrder,
    deletePost,
    getAllPosts,
    getAllVideos,
    getMyPosts,
    getPost,
    likePost,
    updatePost,
} from "../../controllers/postController.js";
import {
    acceptBookingBid,
    cancelMyActiveRide,
    createBookingPayOrder,
    getMyActiveRide,
    getMyFinishedRide,
    regenerateBookingOtp,
    verifyCompleteRide,
} from "../../controllers/rideController.js";
import {
    createUser,
    getUsers,
    partialUpdate,
} from "../../controllers/userController.js";
import {
    deleteVehicle,
    getVehicleById,
    getVehicles,
    registerVehicle,
    updateVehicle,
} from "../../controllers/vehicleController.js";
import {
    createGaragePayOrder,
    verifyBookingPayment,
    verifyPayment,
} from "../../controllers/paymentController.js";
import { validateRequest } from "../../lib/validateRequest.js";
import { apiMiddleware } from "../../middlewares/authMiddleware.js";
import {
    CreateBookingSchema,
    createPostSchema,
    placeBookingBidSchema,
    RegisterVehicleSchema,
    UpdateVehicleSchema,
} from "../../schema/apiSchema.js";
import { createGarage, deleteGarageById, getCreateGarageAmount, getGarageById, getMyGarages, getNearByGarages, updateGarage } from "../../controllers/garageController.js";

// API ////   ---------

const apiRouters = Router();
// API Middleware
apiRouters.use(apiMiddleware);

apiRouters.get("/me", getMe);
apiRouters.route("/videos").get(getAllVideos);
apiRouters
  .route("/posts")
  .get(getAllPosts)
  .post(validateRequest(createPostSchema), createPost);
apiRouters.get("/create-post-pay-order", createPostPayOrder);
apiRouters.post("/verify-payment", verifyPayment);
apiRouters.get("/my-posts", getMyPosts);
apiRouters
  .route("/posts/:id", apiMiddleware)
  .get(getPost)
  .put(validateRequest(createPostSchema), updatePost)
  .delete(deletePost);
apiRouters.get("/like-post/:id", likePost);

// vehicles routes
apiRouters
  .route("/vehicles")
  .get(getVehicles)
  .post(validateRequest(RegisterVehicleSchema), registerVehicle);
apiRouters
  .route("/vehicle/:id")
  .get(getVehicleById)
  .put(validateRequest(UpdateVehicleSchema), updateVehicle)
  .delete(deleteVehicle);

apiRouters.route("/users", apiMiddleware).get(getUsers).post(createUser);
apiRouters.put("/users/partial-update/:id", partialUpdate);

apiRouters
  .route("/bookings")
  .get(getMyBookings)
  .post(validateRequest(CreateBookingSchema), createBooking);
apiRouters.route("/booking/:id").get(getBookingById).delete(deleteBooking);
apiRouters.get("/cancel-booking/:id/", cancelBookingById);
apiRouters.post(
  "/booking/:id/bids",
  validateRequest(placeBookingBidSchema),
  placeBookingBid,
);
apiRouters.post("/booking/:id/bids/:bidId/accept", acceptBookingBid);
apiRouters.get("/booking/:id/complete-ride-otp/:otp", verifyCompleteRide);
apiRouters.get("/booking/:id/regenerate-otp", regenerateBookingOtp);
apiRouters.get("/booking/:id/bids", getBidsForBooking);
apiRouters.get("/driver-rides", getDriverRides);
apiRouters.get("/my-running-rides", getMyActiveRide);
apiRouters.get("/cancel-active-ride/:id", cancelMyActiveRide);
apiRouters.get("/my-finished-rides", getMyFinishedRide);
apiRouters.get("/create-booking-pay-order/:bookingId", createBookingPayOrder);
apiRouters.post("/verify-booking-payment/:bookingId", verifyBookingPayment);

// Notifications routes
apiRouters.get("/notifications", getNotificationsByUserId);
apiRouters.patch("/notifications/:id/read", markNotificationAsRead);
apiRouters.patch("/notifications/read-all", markAllNotificationsAsRead);


// GARAGEs
apiRouters.get("/get-create-garage-amount", getCreateGarageAmount);
apiRouters.get("/get-nearby-garages", getNearByGarages);
apiRouters.get("/my-garages", getMyGarages);
apiRouters.get("/garage/:id", getGarageById);
apiRouters.post("/create-garages", createGarage);
apiRouters.put("/update-garage/:id", updateGarage);
apiRouters.delete("/delete-garage/:id", deleteGarageById);
apiRouters.get("/create-garage-pay-order", createGaragePayOrder);
 


export default apiRouters;
