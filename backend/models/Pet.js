const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['chat', 'chien', 'oiseau']
    },
    breed: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['mâle', 'femelle']
    },
    size: {
        type: String,
        required: true,
        enum: ['petit', 'moyen', 'grand']
    },
    color: {
        type: String,
        required: true,
        trim: true
    },
    isVaccinated: {
        type: Boolean,
        default: false
    },
    isSterilized: {
        type: Boolean,
        default: false
    },
    isAdopted: {
        type: Boolean,
        default: false
    },
    imageUrl: {
        type: String,
        default: ''
    },
    specialNeeds: {
        type: String,
        default: ''
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index pour la recherche
petSchema.index({
    name: 'text',
    description: 'text',
    breed: 'text'
});

module.exports = mongoose.model('Pet', petSchema);