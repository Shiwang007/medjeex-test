const mongoose = require('mongoose');


const avatarSchema = new mongoose.Schema({
    imageUrl: {
        type: 'string',
        required: true
    }
})

const Avatar = mongoose.model("Avatar", avatarSchema);

module.exports = Avatar;