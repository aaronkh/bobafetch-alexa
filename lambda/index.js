const Alexa = require('ask-sdk-core')
const rp = require('request-promise-native')
const persistence = require('ask-sdk-s3-persistence-adapter')

const YES_SESSION_STATE = 'YES_STATE'
const YES_INTENTS = {
    LAST_DRINK_CONFIRMATION: 'LAST_DRINK_CONFIRMATION'
}
const url = 'http://35.230.20.197:5000'
const persistenceAdapter = new persistence.S3PersistenceAdapter({
    bucketName: process.env.S3_PERSISTENCE_BUCKET
})

const createDrink = async (tea, sugar, ice) => {
    try {
        const body = {
            options: {
                tea: tea,
                sugar: parseInt(sugar),
                ice: parseInt(ice)
            }
        }
        await rp({
            method: 'POST',
            uri: `${url}/queue`,
            body: body,
            json: true
        })
    } catch (e) {
        throw new Error(e)
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

        try {
            await createDrink(tea, sugar, ice)

            const speakOutput = `One ${tea} with ${sugar} percent sweetness and ${ice} percent ice coming right up.`
            let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()

            // saves ordered drinks
            const lastDrink = {
                string: `${tea} with ${sugar} percent sweetness and ${ice} percent ice`,
                tea: tea, 
                ice: ice,
                sugar: sugar
            }
            persistentAttributes.lastDrink = lastDrink
            handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
            handlerInput.attributesManager.savePersistentAttributes()

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

const GetLastDrinkIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
            'GetLastDrinkIntent'
        )
    },
    async handle(handlerInput) {
        let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()

        if ('lastDrink' in persistentAttributes) {
            let sessionAttributes = await handlerInput.attributesManager.getSessionAttributes()
            sessionAttributes.yesIntent = YES_INTENTS.LAST_DRINK_CONFIRMATION
            sessionAttributes.state = YES_SESSION_STATE
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

            let lastDrinkString = persistentAttributes.lastDrink.string
            const output = `Your last drink was a ${lastDrinkString}. Would you like to order it again?`
            return handlerInput.responseBuilder
                .speak(output)
                .reprompt(output)
                .withShouldEndSession(false)
                .getResponse()
        } else {
            const output = `You haven't made any orders yet. Try asking for a classic milk tea!`
            return handlerInput.responseBuilder.speak(output).getResponse()
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
        return handlerInput.responseBuilder.speak('Queue').getResponse()
    }
}

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
            case yesIntent:
                try{
                    let drinkObject = persistentAttributes.lastDrink
                    await createDrink(drinkObject.tea, drinkObject.sugar. drinkObject.ice)
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

const NoIntentHandler = {
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

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'SessionEndedRequest'
        )
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.speak('Session ended').getResponse()
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
        YesIntentHandler,
        NoIntentHandler,
        MakeBobaIntentHandler,
        GetQueueIntentHandler,
        HelpIntentHandler,
        GetLastDrinkIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(ErrorHandler)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda()
