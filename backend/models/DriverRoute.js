import mongoose from 'mongoose';

const PointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

const LocationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const DriverRouteSchema = new mongoose.Schema({
  driverName: { type: String, required: true },
  truckId: { type: String, required: true },

  startPoint: { type: PointSchema, required: true },
  endPoint: { type: PointSchema, required: true },

  halts: [PointSchema],

  currentLocation: LocationSchema,

  locationHistory: [LocationSchema]
});

export default mongoose.model('DriverRoute', DriverRouteSchema);
