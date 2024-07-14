const { WaterfallDialog, ComponentDialog, DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');

const Reservation = require('../models/reservationModel');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class MakeReservationDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('makeReservationDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.noOfParticipantsValidator));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
            this.getName.bind(this), // Get user's name
            this.getNumberOfParticipants.bind(this), // Get number of participants for reservation
            this.getDate.bind(this), // Get date for reservation
            this.getTime.bind(this), // Get time for reservation
            this.confirmStep.bind(this), // Show reservation details and ask for confirmation to make reservation
            this.summaryStep.bind(this) // Show summary of reservation and end dialog
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);

        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step) {
        endDialog = false;
        return await step.prompt(CONFIRM_PROMPT, 'Would you like to make a reservation?', ['yes', 'no']);
    }

    async getName(step) {
        console.log(step.result);
        if (step.result === true) {
            return await step.prompt(TEXT_PROMPT, 'In which name reservation should be made?');
        } else {
            await step.context.sendActivity('You chose not to go ahead with the reservation.');
            endDialog = true;
            return await step.endDialog();
        }
    }

    async getNumberOfParticipants(step) {
        step.values.name = step.result;
        return await step.prompt(NUMBER_PROMPT, 'How many people will be in the reservation? (0 - 50)');
    }

    async getDate(step) {
        step.values.numberOfParticipants = step.result;
        return await step.prompt(DATETIME_PROMPT, 'On which date would you like to make the reservation?');
    }

    async getTime(step) {
        step.values.date = step.result[0].value;
        return await step.prompt(DATETIME_PROMPT, 'At what time would you like to make the reservation?');
    }

    async confirmStep(step) {
        step.values.time = step.result[0].value;
        var msg = `Please confirm, You have requested a reservation under the name ${ step.values.name } for ${ step.values.numberOfParticipants } people on ${ step.values.date } at ${ step.values.time }.`;
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'Is this correct?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            // Extract the first name from the provided name
            const firstName = step.values.name.split(' ')[0];
            // Format the current date as YYYYMMDD
            const today = new Date();
            const dateString = today.toISOString().split('T')[0].replace(/-/g, '');
            // Combine the first name and the date to create the customer_id
            const customerId = `${ dateString }-${ firstName }`;

            const reservation = new Reservation({
                customer_id: customerId,
                name: step.values.name,
                numberOfParticipants: step.values.numberOfParticipants,
                date: step.values.date,
                time: step.values.time
            });

            try {
                await reservation.save();
                await step.context.sendActivity(`Reservation successfully confirmed for customer ID: ${ customerId }. Thank you!`);
                endDialog = true;
            } catch (error) {
                console.error('Error saving reservation:', error);
                await step.context.sendActivity('An error occurred while confirming your reservation. Please try again.');
                endDialog = false; // Consider retrying or ending the dialog based on your error handling policy
            }
        } else {
            await step.context.sendActivity('You chose not to go ahead with the reservation.');
            endDialog = true;
        }
        return await step.endDialog();
    }

    async noOfParticipantsValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            if (promptContext.recognized.value > 0 && promptContext.recognized.value < 50) {
                return true;
            } else {
                await promptContext.context.sendActivity('Number of participants should be between 0 to 50.');
            }
        }
        return false;
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.MakeReservationDialog = MakeReservationDialog;
