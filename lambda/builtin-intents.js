const Alexa = require('ask-sdk-core')
const common = require('./common.js')

module.YesIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
    },
    async handle(handlerInput) {
        console.log('Is this Intent being triggered?')
        let sessionAttributes = await handlerInput.attributesManager.getSessionAttributes()
        let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()
        let yesIntent = sessionAttributes.yesIntent
        switch (yesIntent) {
            case common.YES_INTENTS.LAST_DRINK_CONFIRMATION:
                try{
                    let drinkObject = persistentAttributes.lastDrink
                    await common.createDrink(drinkObject.tea, drinkObject.sugar, drinkObject.ice)
                    let drinkString = persistentAttributes.lastDrink.string
                    return handlerInput.responseBuilder.speak(`Okay, one ${drinkString} coming right up`).getResponse()
                } catch(e) {
                    console.log(e)
                    return handlerInput.responseBuilder
                        .speak(`Sorry, there was an error getting that drink. Please try again later.`)
                        .getResponse()
                }
        }

        return handlerInput.responseBuilder
            .speak('Cool!')
            .getResponse()
    }
}

module.exports.NoIntentHandler = {
    canHandle(handlerInput) {
        // const attributes = handlerInput.attributesManager.getSessionAttributes()
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent'
            // && attributes.state === YES_SESSION_STATE // expecting a yes/no question
    },
    async handle(handlerInput) {
        return handlerInput.responseBuilder // clears sessions as well
            .speak('Okay.')
            .getResponse()
    }
}


module.exports.HelpIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
            'AMAZON.HelpIntent'
        )
    },
    handle(handlerInput) {
        const speakOutput = 'Try asking for a classic milk tea!'
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse()
    }
}

module.exports.CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) ===
                'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) ===
                'AMAZON.StopIntent')
        )
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!'
        return handlerInput.responseBuilder.speak(speakOutput).getResponse()
    }
}

module.exports.LaunchRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'LaunchRequest'
        )
    },
    handle(handlerInput) {
        const speakOutput =
            'Ready for all your boba making needs. Let me know if you need any help'
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse()
    }
}