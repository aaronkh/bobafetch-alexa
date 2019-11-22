const Alexa = require('ask-sdk-core')
const request = require('request')
const url = 'http://35.230.20.197:5000'

const LaunchRequestHandler = {
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

const MakeBobaIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
                'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
                'MakeBobaIntent'
        )
    },
    handle(handlerInput) {
        const requestEnvelope = handlerInput.requestEnvelope
        const intent = requestEnvelope.request.intent
        const tea = intent.slots.tea.value
        const sugar = intent.slots.sugar.value
        const ice = intent.slots.ice.value

        const body = {
            options: {
                tea: tea,
                sugar: parseInt(sugar),
                ice: parseInt(ice)
            }
        }

        request({ method: 'POST', uri: url, body: body, json: true }, function(
            err,
            res,
            b
        ) {
            if(err) console.log(err)
            console.log(b)
            const speakOutput = `One ${tea} milk tea with ${sugar} percent sweetness and ${ice} percent ice coming right up.`

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withSimpleCard('Title', 'Content')
                .getResponse()
        })
    }
}

const GetQueueIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
                'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
                'GetQueueIntent'
        )
    },
    handle(handlerInput) {
        return handlerInput.speak('Queue').getResponse()
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
        const speakOutput = 'You can say hello to me! How can I help?'

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

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'SessionEndedRequest'
        )
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse()
    }
}

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest'
        )
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope)
        const speakOutput = `You just triggered ${intentName}`

        return (
            handlerInput.responseBuilder
                .speak(speakOutput)
                //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
                .getResponse()
        )
    }
}

const ErrorHandler = {
    canHandle() {
        return true
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`)
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse()
    }
}

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        MakeBobaIntentHandler,
        GetQueueIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(ErrorHandler)
    .lambda()
