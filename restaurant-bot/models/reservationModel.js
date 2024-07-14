const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    customer_id: { type: String, required: true },
    name: { type: String, required: true },
    numberOfParticipants: { type: Number, required: true, min: 1, max: 50 },
    date: { type: Date, required: true },
    time: { type: String, required: true }
});

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;
