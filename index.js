/**
    Copyright 2017-2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
    Licensed under the Amazon Software License (the "License").
    You may not use this file except in compliance with the License.
    A copy of the License is located at
      http://aws.amazon.com/asl/
    or in the "license" file accompanying this file. This file is distributed
    on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express
    or implied. See the License for the specific language governing
    permissions and limitations under the License.
    This skill demonstrates how to use Dialog Management to delegate slot
    elicitation to Alexa. For more information on Dialog Directives see the
    documentation: https://developer.amazon.com/docs/custom-skills/dialog-interface-reference.html
    This skill also uses entity resolution to define synonyms. Combined with
    dialog management, the skill can ask the user for clarification of a synonym
    is mapped to two slot values.
 **/

/* eslint-disable  func-names */
/* eslint-disable  no-restricted-syntax */
/* eslint-disable  no-loop-func */
/* eslint-disable  consistent-return */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');

/* INTENT HANDLERS */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Welcome to Personality Test. I will help you discover your hidden personality. Do you want to know who you are?')
      .reprompt('Do you want to know your personality type?')
      .getResponse();
  },
};
const RejectionIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest' 
      && request.intent.name === 'RejectionIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('You don\'t want to know your personality type? Have fun wasting away your potential.')
      .getResponse();
  },
};

const InProgressRecommendationIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'RecommendationIntent'
      && request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    let prompt = '';

    for (const slotName of Object.keys(handlerInput.requestEnvelope.request.intent.slots)) {
      const currentSlot = currentIntent.slots[slotName];
      if (currentSlot.confirmationStatus !== 'CONFIRMED'
                && currentSlot.resolutions
                && currentSlot.resolutions.resolutionsPerAuthority[0]) {
        if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
          if (currentSlot.resolutions.resolutionsPerAuthority[0].values.length > 1) {
            prompt = 'Which would you like';
            const size = currentSlot.resolutions.resolutionsPerAuthority[0].values.length;

            currentSlot.resolutions.resolutionsPerAuthority[0].values
              .forEach((element, index) => {
                prompt += ` ${(index === size - 1) ? ' or' : ' '} ${element.value.name}`;
              });

            prompt += '?';

            return handlerInput.responseBuilder
              .speak(prompt)
              .reprompt(prompt)
              .addElicitSlotDirective(currentSlot.name)
              .getResponse();
          }
        } else if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
          if (requiredSlots.indexOf(currentSlot.name) > -1) {
            prompt = `What ${currentSlot.name} are you looking for`;

            return handlerInput.responseBuilder
              .speak(prompt)
              .reprompt(prompt)
              .addElicitSlotDirective(currentSlot.name)
              .getResponse();
          }
        }
      }
    }

    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  },
};

const CompletedRecommendationIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'RecommendationIntent'
      && request.dialogState === 'COMPLETED';
  },
  handle(handlerInput) {
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;

    const slotValues = getSlotValues(filledSlots);

    const key = `${slotValues.personality.resolved}-${slotValues.information.resolved}-${slotValues.nature.resolved}-${slotValues.tactic.resolved}`;
    const occupation = options[slotsToOptionsMap[key]];


  const speechOutput = `So you are ${slotValues.personality.resolved
    }. You rely on ${slotValues.information.resolved
    }. You think emotions are ${slotValues.nature.resolved}. You ${slotValues.tactic.resolved} ` +
            `. Your personality type is ${occupation.name}.` ;
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest' 
      && request.intent.name === 'AMAZON.HelpIntent';
  },
 handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('This is personality quizz. I can help you understand your personality type. You can say, what is my personality type.')
      .reprompt('Would you like to know your personality type?')
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Bye')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};


const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/* CONSTANTS */

const skillBuilder = Alexa.SkillBuilders.custom();

const requiredSlots = [
  'personality',
  'information',
  'nature',
  'tactic',
];

const slotsToOptionsMap = {
  'extrovert-guts-deeper-plan' : 0 , /*ENFJ*/
  'extrovert-reality-deeper-plan' : 1 , /*ESFJ*/
  'introvert-guts-deeper-plan' : 2 , /*INFJ*/
  'introvert-reality-deeper-plan' : 3, /*ISFJ*/
  'extrovert-guts-hormonal-plan' : 4 , /*ENTJ*/
  'extrovert-reality-hormonal-plan' : 5 ,  /*ESTJ*/
  'introvert-guts-hormonal-plan' : 6 , /*INTJ*/
  'introvert-reality-hormonal-plan' : 7, /*ISTJ*/
  'extrovert-guts-deeper-improvise' : 8 , /*ENFP*/
  'extrovert-reality-deeper-improvise' : 9 , /*ESFP*/
  'introvert-guts-deeper-improvise' : 10 , /*INFP*/
  'introvert-reality-deeper-improvise' : 11, /*ISFP*/
  'extrovert-guts-hormonal-improvise' : 12 ,/*ENTP*/
  'extrovert-reality-hormonal-improvise' : 13 , /*ESTP*/
  'introvert-guts-hormonal-improvise' : 14 , /*INTP*/
  'introvert-reality-hormonal-improvise' : 15, /*ISTP*/
};
const options = [
  
  { name: 'Protagonist : ENFJ for Extrovert,iNtuition, Feeling and Judjment. You are a natural-born leader, full of passion and charisma. You make decisions based on your values. You are organized, structured and have to be on control of your life.'},
  { name: 'Consul. ESFJ. for Extrovert, Sensation, Feeling and Judgment. Careers as administrator is a natural fit, allowing you to organize not just an environment, but the people in it.' },
  { name: 'ADVOCATE. INFJ. for Introvert, iNtuition, Feeling and Judgment. Your desire to help and connect makes careers in healthcare very rewarding. Roles as counselors, psychologists, doctors, life coaches and spiritual guides are all attractive options.' },
  { name: 'DEFENDER. ISFJ. for Introvert, Sensation, Feeling and Judjment. You are meticulous, hard worker and dedicated. You are good at supporting coworkers and customers in human resources and support positions. ' },
  { name: 'COMMANDER. ENTJ. for Extrovert, iNtuition, Thinking and Judgment. You are natural-born leader, full of charisma and confidence. You project authority in a way that gather crowds behind a common goal. You ideal line of work is in executive positions and entrepreneurship.' },
  { name: 'EXECUTIVE. ESTJ .for Extrovert, Sensation, Thinking and Judgment. You are the image of model citizen. You have affinity for organization, structure, and follow-through. You have many traits inherent to leadership regardless the chosen work domain.' },
  { name: 'ARCHITECT. INTJ. for Introvert, iNtuition, Thinking and Judgment. You are imaginative and strategic thinker, with a plan for every thing. Architects prefer more “lone wolf” positions as mechanical or software engineers, lawyers or freelance consultants, don\'t respond well to authority.' },
  { name: 'LOGISTICIAN. ISTJ. for Introvert, Sensation, Thinking and Judgment. You are practical and fact minded individual. Careers as military officers, lawyers, judges, police officers and detectives are all very popular among Logisticians.' },
  { name: 'CAMPAIGNER. ENFP. for Extrovert, iNtuition, Feeling and Perception. You have an exceptional social perception. You understand human interactions and communication styles of your audience. Your energetic, future-minded, need to work in fields where boudaries are pushed, and don\'t respond to hierarchy.' },
  { name: 'ENTERTAINER. ESFP. for Extrovert, Sensation, Feeling, Perception. Your are have plenty of creative energy. You need freedom, novelty, and human contact. Consider careers where you can help others and be in direct contact with people, or creative and artistics ones.' },
  { name: 'MEDIATOR. INFP. for Introvert, iNtuition, Feeling, Perception. You therive on creative expression and personal growth. They are alteruistic, eager to help a good cause. Consider service carrers, counselling, or academic  ' },
  { name: 'ADVENTURER. ISFP. for Introvert, Sensation, Feeling, Perception. You are a free soul and need flexibility, opportunities for improvisation, and immersive work that engages every sense' },
  { name: 'DEBATER. ENTP. for Extrovert, iNtuition, Thinking, Perception. You are smart and curious thinkers, that therieve on intellectual challenge. You can thrive in most any career that is in need of a new line of thinking.' },
  { name: 'ENTREPRENEUR. ESTP. for Extrovert, Sensation, Thinking, Perception. You are smart, energetic and very perceptive. Your career option is action.' },
  { name: 'LOGICIAN. INTP. for Introvert, iNtuition, Thinking, Perception. You are an innovative inventor with a thurst of knowledge. Your interests is exploring and building models for underlying principles and ideas.' },
  { name: 'VIRTUOSO. ISTP. for Introvert, Sensation, Thinking, Perception. You are a natural maker who love to explore with your hands and eyes, touching and examining the world around you with cool rationalism and spirited curiosity.' },
];
/*make decisions based on logic/ your values, Your are casual and relaxed, able to change and adapt quickly/You are organized, structured and have to be on control of your life.*/
/* HELPER FUNCTIONS */

function getSlotValues(filledSlots) {
  const slotValues = {};

  console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name;

    if (filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
      switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
        case 'ER_SUCCESS_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
            isValidated: true,
          };
          break;
        case 'ER_SUCCESS_NO_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].value,
            isValidated: false,
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        synonym: filledSlots[item].value,
        resolved: filledSlots[item].value,
        isValidated: false,
      };
    }
  }, this);

  return slotValues;
}

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    RejectionIntent,
    InProgressRecommendationIntent,
    CompletedRecommendationIntent,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler,    
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();