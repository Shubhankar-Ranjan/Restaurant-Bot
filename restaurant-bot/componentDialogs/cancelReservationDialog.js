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

class CancelReservationDialog extends ComponentDialog {
    constructor(conversationState, userState) {
        super('cancelReservationDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
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
        await step.context.sendActivity('Enter your Customer ID for cancellation:');
        return await step.prompt(TEXT_PROMPT, '');
    }

    async confirmStep(step) {
        step.values.customer_id = step.result;
        var msg = `You have entered Customer ID: ${ step.values.customer_id }`;
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'Is this correct?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            try {
                await Reservation.findOneAndDelete({ customer_id: step.values.customer_id });
                await step.context.sendActivity('Reservation successfully cancelled. Thank you!');
            } catch (error) {
                console.error('Error cancelling reservation:', error);
                await step.context.sendActivity('An error occurred while cancelling the reservation. Please try again later.');
            }
        } else {
            await step.context.sendActivity('Cancellation process terminated. Your reservation remains unchanged.');
        }
        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.CancelReservationDialog = CancelReservationDialog;
