const Alexa = require('ask-sdk-core')
const common = require('./common.js')

const YesIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
    },
    async handle(handlerInput) {
        let sessionAttributes = await handlerInput.attributesManager.getSessionAttributes()
        let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()
        let yesIntent = sessionAttributes.yesIntent
        switch (yesIntent) {
            case common.YES_INTENTS.LAST_DRINK_CONFIRMATION:
                try{
                    let drinkObject = persistentAttributes.lastDrink
                    let drinkString = persistentAttributes.lastDrink.string
                    await common.enqueue({
                        string: drinkString,
                        name: "Anonymous"
                    })
                    let request = handlerInput.requestEnvelope;
                    let { apiEndpoint, apiAccessToken } = request.context.System;
                    let apiResponse = await common.getConnectedEndpoints(apiEndpoint, apiAccessToken);
                    if ((apiResponse.endpoints || []).length === 0) {
                        return handlerInput.responseBuilder
                            .speak("Please find a connected device and try again.")
                            .getResponse();
                    }
                    
                    let endpointId = apiResponse.endpoints[0].endpointId
                    persistentAttributes.endpointId = endpointId
                    let token = handlerInput.attributesManager.getPersistentAttributes().token || handlerInput.requestEnvelope.request.requestId;
    
                    handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
                    handlerInput.attributesManager.savePersistentAttributes()

                    return handlerInput.responseBuilder
                        .addDirective({
                            type: "CustomInterfaceController.StartEventHandler",
                            token: token,
                            expiration: {
                                durationInMilliseconds: 90000,
                            }
                        })
                        .addDirective(common.build(endpointId,
                            'Custom.Mindstorms.Gadget', 'control',
                            {
                                "type": "automatic",
                                "name": 'Anonymous',
                                "tea": drinkObject.tea,
                                "sugar": drinkObject.sugar,
                                "ice": drinkObject.ice
                            }
                        ))
                        .speak(`Okay, one ${drinkString} coming right up`)
                        .getResponse()
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

const NoIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent'
    },
    async handle(handlerInput) {
        return handlerInput.responseBuilder // clears sessions as well
            .speak('Okay.')
            .getResponse()
    }
}


const HelpIntentHandler = {
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

const CancelAndStopIntentHandler = {
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

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'LaunchRequest'
        )
    },
    handle(handlerInput) {
        const speakOutput = `I'm Boba fetch, what's your order?`
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse()
    }
}

module.exports.intents = [
    LaunchRequestHandler, 
    CancelAndStopIntentHandler, 
    YesIntentHandler, 
    NoIntentHandler, 
    HelpIntentHandler
]