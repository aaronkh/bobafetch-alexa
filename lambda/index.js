// MODULES 
const Alexa = require('ask-sdk-core')
const persistence = require('ask-sdk-s3-persistence-adapter')

// LOCAL IMPORTS
const common = require('./common.js')
const BuiltinIntents = require('./builtin-intents.js')

const persistenceAdapter = new persistence.S3PersistenceAdapter({
    bucketName: process.env.S3_PERSISTENCE_BUCKET
})

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
            let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()

            // saves ordered drinks
            const currentDrink = {
                string: `${tea} with ${sugar} percent sweetness and ${ice} percent ice`,
                tea: tea,
                ice: ice,
                sugar: sugar
            }

            if (persistentAttributes.isPurchasing) {
                let ispIdList = common.getISPListByName(handlerInput.serviceClientFactory.getMonetizationServiceClient(), 'Boba')
                if (ispIdList.length > 0 && ispIdList[0] === 'PURCHASABLE'){
                    // session attributes are cleared during payment flow, so we save into persistent
                    persistentAttributes.currentDrink = currentDrink
                    handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
                    handlerInput.attributesManager.savePersistentAttributes()

                    return handlerInput.responseBuilder
                        .speak(`Your order will cost $3. Is that OK?`) // TODO: check costs at runtime
                        .addDirective({
                            type: 'Connections.SendRequest',
                            name: 'Buy',
                            payload: {
                                InSkillProduct: {
                                    productId: ispIdList[0].productId,
                                }
                            },
                            token: "correlationToken"
                        })
                        .withShouldEndSession(true) // ISP always ends your session during the payment flow
                        .withSimpleCard('Title', 'Content')
                        .getResponse()
                } else {
                    return handlerInput.responseBuilder
                        .speak(`Sorry, there was a problem purchasing your drink.`)
                }
            } else {
                await common.createDrink(tea, sugar, ice)
                const speakOutput = `One ${tea} with ${sugar} percent sweetness and ${ice} percent ice coming right up.`
                persistentAttributes.lastDrink = currentDrink
                handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
                handlerInput.attributesManager.savePersistentAttributes()
                return handlerInput.responseBuilder.speak(speakOutput).getResponse()
            }
        } catch (err) {
            console.log(err)

            return handlerInput.responseBuilder
                .speak('Something went wrong. Please try again')
                .getResponse()
        }
    }
}

const BobaPurchaseHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'Connections.Response' && 
            handlerInput.requestEnvelope.request.name === 'Buy'
        )
    },
    async handler(handlerInput) {
        const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()

        if(!persistentAttributes.currentDrink) {
            console.log('How did you get here, nobody knows')
            return handlerInput.responseBuilder.speak('You somehow completed a purchase without an order').getResponse()
        }

        let speakOutput = '';
    
        // IF THE USER DECLINED THE PURCHASE.
        if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
            const currentDrink = persistentAttributes.currentDrink
            await common.createDrink(currentDrink.tea, currentDrink.sugar, currentDrink.ice)
            speakOutput = `Thank you. Your order has been added to the queue.`
        } else if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ERROR') {
          speakOutput = `We couldn't complete your purchase right now. Please try again later.`
        }
        // declines are handled automatically by alexa
    
        // move current drink -> last drink
        persistentAttributes.lastDrink = persistentAttributes.currentDrink
        persistentAttributes.currentDrink = undefined
        handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
        handlerInput.attributesManager.savePersistentAttributes()
    
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .getResponse();
    }
}

const TogglePurchasingIntent = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
            'TogglePurchasingIntent'
        )
    },
    async handle(handlerInput) {
        const requestEnvelope = handlerInput.requestEnvelope
        const intent = requestEnvelope.request.intent
        const toggle = intent.slots.OnOff.value

        let persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()

        // saves ordered drinks
        persistentAttributes.isPurchasing = toggle.toLowerCase() === 'on'
        handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
        handlerInput.attributesManager.savePersistentAttributes()

        return handlerInput.responseBuilder
            .speak(`Purchasing set to ${toggle.toLowerCase() === 'on'}`)
            .getResponse()
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
            sessionAttributes.yesIntent = common.YES_INTENTS.LAST_DRINK_CONFIRMATION
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
        BuiltinIntents.LaunchRequestHandler,
        TogglePurchasingIntent,
        BobaPurchaseHandler,
        BuiltinIntents.YesIntentHandler,
        BuiltinIntents.NoIntentHandler,
        MakeBobaIntentHandler,
        GetQueueIntentHandler,
        BuiltinIntents.HelpIntentHandler,
        GetLastDrinkIntentHandler,
        BuiltinIntents.CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(ErrorHandler)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda()
