
const StartInputIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'StartEventHandlerIntent';
    },
    handle(handlerInput) {

        // https://developer.amazon.com/en-US/docs/alexa/alexa-gadgets-toolkit/receive-custom-event-from-gadget.html#start
        console.log(`registered event handler for ${handlerInput.requestEnvelope.request.requestId}`);
        return handlerInput.responseBuilder
            .speak("Let's start the game!")
            .withShouldEndSession(false)
            .addDirective({
                'type': 'CustomInterfaceController.StartEventHandler',
                'token': handlerInput.requestEnvelope.request.requestId,
                'expiration': {
                    'durationInMilliseconds': 90000, // will only receive for up to 90s
                },
            })
            .getResponse();
    }
};


//TODO: validate gadgets
const CupEventHandler = {
    canHandle(handlerInput) {
        return (handlerInput.requestEnvelope.request.type !== 'CustomInterfaceController.EventsReceived') &&
            handlerInput.requestEnvelope.request.events[0].header.name === 'CUP';
    },
    handle(handlerInput) {
        console.log("== Received custom event == CUP");
        return handlerInput.responseBuilder
            .speak("Please insert a cup.")
            .getResponse();
    }
}

const DoneEventHandler = {
    canHandle(handlerInput) {
        return (handlerInput.requestEnvelope.request.type !== 'CustomInterfaceController.EventsReceived') &&
            handlerInput.requestEnvelope.request.events[0].header.name === 'DONE';
    },
    handle(handlerInput) {
        console.log("== Received custom event == DONE");
        let { request } = handlerInput.requestEnvelope
        let payload = request.events[0].payload;

        return handlerInput.responseBuilder
            .speak(payload.speak)
            .getResponse();

    }

}

const PourEventHandler = {
    canHandle(handlerInput) {
        return (handlerInput.requestEnvelope.request.type !== 'CustomInterfaceController.EventsReceived') &&
            handlerInput.requestEnvelope.request.events[0].header.name === 'POUR';
    },
    handle(handlerInput) {
        console.log("== Received custom event == POUR");
        let { request } = handlerInput.requestEnvelope
        let payload = request.events[0].payload;

        return handlerInput.responseBuilder
            .speak(`Pouring ${payload.tea} for ${payload.time_in_s} seconds`)
            .getResponse();
    }
}

const DispenseEventHandler = {
    canHandle(handlerInput) {
        return (handlerInput.requestEnvelope.request.type !== 'CustomInterfaceController.EventsReceived') &&
            handlerInput.requestEnvelope.request.events[0].header.name === 'DISPENSE';
    },
    handle(handlerInput) {
        console.log("== Received custom event == DISPENSE");
        let { request } = handlerInput.requestEnvelope
        let payload = request.events[0].payload;

        return handlerInput.responseBuilder
            .speak(` Dispensing boba for ${payload.cycles} cycles`)
            .getResponse();
    }
}

const ExpiredEventHandler = {
    canHandle(handlerInput) {
        let { request } = handlerInput.requestEnvelope;
        return request.type === 'CustomInterfaceController.Expired';
    },
    handle(handlerInput) {
        console.log("== Custom event expiration input ==");
        // let { request } = handlerInput.requestEnvelope;
        // let data = request.expirationPayload.data;
        // let response = handlerInput.responseBuilder
        //     .withShouldEndSession(true)
        //     .speak(data)
        //     .getResponse();
        // response.directives = response.directives || [];
        // return response;
        // Set the token to track the event handler

        // Extends skill session by starting another event handler
        return handlerInput.responseBuilder
            .addDirective({
                type: "CustomInterfaceController.StartEventHandler",
                token: handlerInput.requestEnvelope.request.requestId,
                expiration: {
                    durationInMilliseconds: 90000,
                }
            })
            .getResponse();
    }
}

module.exports.events = [
    StartInputIntentHandler,
    CupEventHandler,
    ExpiredEventHandler,
    DispenseEventHandler,
    PourEventHandler,
    DoneEventHandler
]




