// MODULES 
const Alexa = require('ask-sdk-core')
const persistence = require('ask-sdk-s3-persistence-adapter')

// LOCAL IMPORTS
const common = require('./common.js')

const TEAS = ['oolong milk tea', 'classic milk tea', 'jasmine milk tea']
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
        const person = handlerInput.requestEnvelope.context.System.person

        console.log(person)
        
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
                const speakOutput = ` Okay ${person ? `<alexa:name type="first" personId="${person.personId}"/>`:''}, One ${tea} with ${sugar} percent sweetness and ${ice} percent ice coming right up.`
                persistentAttributes.lastDrink = currentDrink
                persistentAttributes.token = handlerInput.requestEnvelope.request.requestId
                
                await common.enqueue({
                    "name": person? person.personId : 'Anonymous',
                    "string": currentDrink.string
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
                        "name": person ? person.personId : 'Anonymous',
                        "tea": tea,
                        "sugar": sugar,
                        "ice": ice
                    }
                ))
                .speak(speakOutput).getResponse()
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
        // return false
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

        if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
            currentDrink = persistentAttributes.currentDrink
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

        await common.enqueue({
            "name": person? person.personId : 'Anonymous',
            "string": currentDrink.string
        })

        let endpointId = persistentAttributes.endpointId
        let token = handlerInput.attributesManager.getPersistentAttributes().token || handlerInput.requestEnvelope.request.requestId;

        const person = handlerInput.requestEnvelope.context.System.person

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
                        "type": !currentDrink || "automatic",
                        "name": person? person.personId : 'Anonymous',
                        "tea": currentDrink.tea,
                        "sugar": currentDrink.sugar,
                        "ice": currentDrink.ice
                    }
                ))
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
    async handle(handlerInput) {
        let queue = await common.getQueue(handlerInput)
        let output = `There are ${queue.length} items in the queue: `
        for(let i = 0; i < queue.length; i++) {
            output += `${queue[i].string} ${queue[i].name === 'Anonymous'? '':`for <alexa:name type="first" personId="${queue[i]}"/>`},`
        }

        return handlerInput.responseBuilder.speak(output).getResponse()
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
    async handle(handlerInput) {
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
        console.log(sessionAttributes)
        sessionAttributes.mode = 'manual'
        let request = handlerInput.requestEnvelope;

        let { apiEndpoint, apiAccessToken } = request.context.System;
        let apiResponse = await common.getConnectedEndpoints(apiEndpoint, apiAccessToken);
        if ((apiResponse.endpoints || []).length === 0) {
            return handlerInput.responseBuilder
                .speak("Please find a connected device and try again.")
                .getResponse();
        }
        
        let endpointId = apiResponse.endpoints[0].endpointId
        sessionAttributes.endpointId = endpointId
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
        let token = handlerInput.attributesManager.getPersistentAttributes().token || handlerInput.requestEnvelope.request.requestId;
        
        return handlerInput.responseBuilder
            .addDirective({
                type: "CustomInterfaceController.StartEventHandler",
                token: token,
                expiration: {
                    durationInMilliseconds: 90000,
                }
            })
            .reprompt('Awaiting commands')
            .getResponse()
    }

}

const ManualListenerIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.attributesManager.getSessionAttributes().mode === 'manual'
    },
    handle(handlerInput) { // add directive
        // cancels are handled by built-in intents
        const requestEnvelope = handlerInput.requestEnvelope
        const intent = requestEnvelope.request.intent || { slots: { Action: { value: 'dispense' }, length: { value: 8 }, unit: { value: 'seconds' } } }
        const action = intent.slots.Action.value
        const length = intent.slots.length.value
        const unit = intent.slots.unit.value

        return handlerInput.responseBuilder
            .addDirective(common.build(handlerInput.attributesManager.getSessionAttributes().endpointId,
                'Custom.Mindstorms.Gadget', 'control',
                {
                    "type": "manual",
                    "num": length,
                    "command": action
                }
            ))
            .speak(`${action} ${length} ${unit}`)
            .reprompt(`Awaiting commands`)
            .getResponse()
    }

}

const MenuIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
            'MenuIntent'
        )
    },
    handle(handlerInput) { 
        return handlerInput.responseBuilder
            .speak(`Right now, we have ${common.joinWithAnd(TEAS)}.`)
            .reprompt(`Let me know if you want to order anything.`)
            .getResponse()
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
        MenuIntentHandler,
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
