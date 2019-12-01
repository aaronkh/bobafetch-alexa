const Alexa = require('ask-sdk-core')
const rp = require('request-promise-native')
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
    async handle(handlerInput) {
        console.log(handlerInput)
        const requestEnvelope = handlerInput.requestEnvelope
        const intent = requestEnvelope.request.intent
        const tea = intent.slots.Tea.value
        const sugar = intent.slots.Sugar.value
        const ice = intent.slots.Ice.value

        const body = {
            options: {
                tea: tea,
                sugar: parseInt(sugar),
                ice: parseInt(ice)
            }
        }

        try {
            await rp({
                method: 'POST',
                uri: `${url}/queue`,
                body: body,
                json: true
            })

            const speakOutput = `One ${tea} with ${sugar} percent sweetness and ${ice} percent ice coming right up.`

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withSimpleCard('Title', 'Content')
                .getResponse()
        } catch (err) {
            console.log(err)

            return handlerInput.responseBuilder
                .speak('Something went wrong. Please try again')
                .getResponse()
        }
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
    .withTableName("lastOrder") // stores customer orders in a table; see more at shorturl.at/DIUWX
    .withAutoCreateTable(true) // auto creates table if not exist
    .addErrorHandlers(ErrorHandler)
    .lambda()
