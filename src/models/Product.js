const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    league: {
        type: String,
        enum: ['NBA', 'ACB', 'Ambas'],
        default: 'NBA'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);