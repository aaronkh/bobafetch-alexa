//TODO: validate gadgets
const CupEventHandler = {
    canHandle(handlerInput) {
        let { request } = handlerInput.requestEnvelope;
        if (request.type !== 'CustomInterfaceController.EventsReceived') return false;
        let customEvent = request.events[0];
        return customEvent && handlerInput.requestEnvelope.request.events[0].header.name === 'CUP';
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
        let { request } = handlerInput.requestEnvelope;
        if (request.type !== 'CustomInterfaceController.EventsReceived') return false;
        let customEvent = request.events[0];
        return customEvent && handlerInput.requestEnvelope.request.events[0].header.name === 'DONE';
    },
    handle(handlerInput) {
        console.log("== Received custom event == DONE");
        console.log(handlerInput.requestEnvelope.request.events[0])
        let payload = handlerInput.requestEnvelope.request.events[0].payload
        let ssml = `Hello, your ${payload.tea} with ${payload.sugar} percent sugar and ${payload.ice} percent ice is finished. Please come pick it up!`
        console.log(ssml)
        return handlerInput.responseBuilder
            .speak(`<amazon:emotion name="excited" intensity="high">${ssml}</<amazon:emotion>`)
            .getResponse();
    }

}

const PourEventHandler = {
    canHandle(handlerInput) {
        let { request } = handlerInput.requestEnvelope;
        if (request.type !== 'CustomInterfaceController.EventsReceived') return false;
        let customEvent = request.events[0];
        return customEvent && handlerInput.requestEnvelope.request.events[0].header.name === 'POUR';
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
        let { request } = handlerInput.requestEnvelope;
        if (request.type !== 'CustomInterfaceController.EventsReceived') return false;
        let customEvent = request.events[0];
        return customEvent && handlerInput.requestEnvelope.request.events[0].header.name === 'DISPENSE';
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
    CupEventHandler,
    ExpiredEventHandler,
    DispenseEventHandler,
    PourEventHandler,
    DoneEventHandler
]




