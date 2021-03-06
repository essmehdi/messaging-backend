const mongoose = require('mongoose');
const User = require('./user')

class MessageInvalidError extends Error {
    constructor(message) {
        super(message)
        this.name = "MessageInvalidError"
    }
}

const messageSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [ 'text', 'image', 'video', 'document', 'file', 'link' ],
    },
    content: mongoose.Schema.Types.Mixed,
    from: { type: String, required: true},
    to: { type: String, required: true },
    caption: String,
    replyTo: {
        type: String,
        content: String,
        caption: String,
        from: String
    },
    dateSent: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

messageSchema.pre('save', function(next) {
    if (this.type === 'text') {
        if (!this.content || this.content === "") {
            throw new MessageInvalidError("You cannot send empty message")
        }
        this.content = this.content.replace(/^\s+/, '')
        next()
    } else {
        next()
    }
})

messageSchema.post('save', async message => {
    const userFrom = await User.findOne({ userName: message.from })
    const userTo = await User.findOne({ userName: message.to })
    await User.updateOne({ userName: message.to },
        { $set: { "listOfContacts.$[contact].lastMessage": message._id } },
        { arrayFilters: [ { "contact.who": userFrom._id } ] })
    await User.updateOne({ userName: message.from },
        { $set: { "listOfContacts.$[contact].lastMessage": message._id } },
        { arrayFilters: [ { "contact.who": userTo._id } ] })    
})

module.exports = mongoose.model('Message', messageSchema)