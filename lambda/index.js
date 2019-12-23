// MODULES 
const Alexa = require('ask-sdk-core')
const persistence = require('ask-sdk-s3-persistence-adapter')

// LOCAL IMPORTS
const common = require('./common.js')

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
        const person = handlerInput.requestEnvelope.request.context.System.person

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
                let ispIdList = await common.getISPListByName(handlerInput.serviceClientFactory.getMonetizationServiceClient(), 'Boba')
                if (ispIdList.length > 0 && ispIdList[0].purchasable === 'PURCHASABLE') {
                    // session attributes are cleared during payment flow, so we save into persistent
                    persistentAttributes.currentDrink = currentDrink
                    handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
                    handlerInput.attributesManager.savePersistentAttributes()
                    return handlerInput.responseBuilder
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
                        .getResponse()
                } else {
                    return handlerInput.responseBuilder
                        .speak(`Sorry, there was a problem purchasing your drink.`).getResponse()
                }
            } else {
                await common.createDrink(tea, sugar, ice)
                const speakOutput = `One ${tea} with ${sugar} percent sweetness and ${ice} percent ice coming right up.`
                persistentAttributes.lastDrink = currentDrink
                persistentAttributes.token = handlerInput.requestEnvelope.request.requestId
                handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
                handlerInput.attributesManager.savePersistentAttributes()
                return handlerInput.responseBuilder.addDirective({
                    type: "CustomInterfaceController.StartEventHandler",
                    token: handlerInput.requestEnvelope.request.requestId,
                    expiration: {
                        durationInMilliseconds: 90000,
                    }
                }).addDirective({
                    type: "automatic",
                    "name": person? person.personId : undefined,
                    "tea": tea,
                    "sugar": sugar,
                    "ice": ice
                }).speak(speakOutput).getResponse()
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
        return (handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
            handlerInput.requestEnvelope.request.name === 'Buy')
    },
    async handle(handlerInput) {
        // console.log('handler handler handler handler handler ')
        const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes()

        if (!persistentAttributes.currentDrink) {
            console.log('How did you get here, nobody knows')
            return handlerInput.responseBuilder.speak('You somehow completed a purchase without an order').getResponse()
        }


        let speakOutput = ``
        let currentDrink = undefined

        // // IF THE USER DECLINED THE PURCHASE.
        if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
            currentDrink = persistentAttributes.currentDrink
            await common.createDrink(currentDrink.tea, currentDrink.sugar, currentDrink.ice)
            speakOutput = `A ${currentDrink.string} has been added to the queue. See you again soon!`
        } else if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ERROR') {
            speakOutput = `We couldn't complete your purchase right now. Please try again later.`
            return handlerInput.responseBuilder.speak(speakOutput).getResponse()
        } 
        // // declines are handled automatically by alexa

        // // move current drink -> last drink
        persistentAttributes.lastDrink = persistentAttributes.currentDrink
        persistentAttributes.currentDrink = undefined
        persistentAttributes.token = handlerInput.requestEnvelope.request.requestId
        handlerInput.attributesManager.setPersistentAttributes(persistentAttributes)
        handlerInput.attributesManager.savePersistentAttributes()
        return handlerInput.responseBuilder
            .addDirective({
                type: "CustomInterfaceController.StartEventHandler",
                token: handlerInput.requestEnvelope.request.requestId,
                expiration: {
                    durationInMilliseconds: 90000,
                }
            })
            .addDirective({
                type: !currentDrink || "automatic",
                "name": 'name',
                "tea": currentDrink.tea,
                "sugar": currentDrink.sugar,
                "ice": currentDrink.ice
            })            
            .speak(speakOutput)
            .getResponse()
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

const ManualIntentHandler = { 
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
            'ManualIntent'
        )
    },
    handle(handlerInput) {
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
        console.log(sessionAttributes)
        sessionAttributes.mode = 'manual'
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
        return handlerInput.responseBuilder
        .speak('Ready').reprompt("Awaiting commands").getResponse()
    }

}

const ManualListenerIntentHandler = { 
    canHandle(handlerInput) {
        return (
            handlerInput.attributesManager.getSessionAttributes().mode === 'manual'
        )
    },
    handle(handlerInput) { // add directive
        // cancels are handled by built-in intents
        const requestEnvelope = handlerInput.requestEnvelope
        const intent = requestEnvelope.request.intent
        const action = intent.slots.Action.value
        const length = intent.slots.length.value
        const unit = intent.slots.unit.value
        console.log({action, length, unit})
        // parse query
        let token = handlerInput.attributesManager.getPersistentAttributes().token || '';
        return handlerInput.responseBuilder
        .addDirective({
            "type": "manual",
            "token": token,
            "num": length,
            "command": action
        })
        .reprompt(`${action} ${length} ${unit}`)
        .getResponse()
    }

}

//TODO: ask for name if person is not recognized
// const GetNameIntentHandler = {
//     canHandle(handlerInput) {
//         return (
//             handlerInput.attributesManager.getSessionAttributes() &&
//             handlerInput.attributesManager.getSessionAttributes().mode === 'name'
//         )
//     }, 
//     handle(handlerInput) {
//              // cancels are handled by built-in intents
//             //  const requestEnvelope = handlerInput.requestEnvelope
//             //  const intent = requestEnvelope.request.intent
//             //  const Name = intent.slots.Name
//              // parse query
//              return handlerInput.responseBuilder.getResponse()
        
//     }
// }

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

const RequestLog = {
    process(handlerInput) {
        console.log("REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope))
        return
    }
}

module.exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        ...require('./builtin-intents.js').intents,
        ...require('./custom-events.js').events,
        ManualIntentHandler,
        ManualListenerIntentHandler,
        TogglePurchasingIntent,
        BobaPurchaseHandler,
        MakeBobaIntentHandler,
        GetQueueIntentHandler,
        GetLastDrinkIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(RequestLog)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda()
