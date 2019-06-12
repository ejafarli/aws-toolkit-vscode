/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

import * as vscode from 'vscode'
import { getLogger } from '../logger'

/**
 * Options to configure the behavior of the quick pick UI.
 * Generally used to accommodate features not provided through vscode.QuickPickOptions
 */
export interface AdditionalQuickPickOptions {
    title?: string
    value?: string
}

/**
 * Creates a QuickPick to let the user pick an item from a list
 * of items of type T.
 *
 * Used to wrap createQuickPick and accommodate
 * a common set of features for the Toolkit.
 *
 * Parameters:
 *  options - initial picker configuration
 *  items - set of selectable vscode.QuickPickItem based items to initialize the picker with
 *  buttons - set of buttons to initialize the picker with
 * @return A new QuickPick.
 */
export function createQuickPick<T extends vscode.QuickPickItem>({
    options,
    items,
    buttons,
}: {
    options?: vscode.QuickPickOptions & AdditionalQuickPickOptions,
    items?: T[],
    buttons?: vscode.QuickInputButton[],
}): vscode.QuickPick<T> {

    const picker = vscode.window.createQuickPick<T>()

    if (options) {
        picker.title = options.title
        picker.placeholder = options.placeHolder
        picker.value = options.value || ''
        if (options.matchOnDescription !== undefined) { picker.matchOnDescription = options.matchOnDescription }
        if (options.matchOnDetail !== undefined) { picker.matchOnDetail = options.matchOnDetail }
        if (options.ignoreFocusOut !== undefined) { picker.ignoreFocusOut = options.ignoreFocusOut }

        // TODO : Apply more options as they are needed in the future, and add corresponding tests
    }

    if (items) {
        picker.items = items
    }

    if (buttons) {
        picker.buttons = buttons
    }

    return picker
}

/**
 * Convenience method to allow the QuickPick to be treated more like a dialog.
 *
 * This method shows the picker, and returns after the picker is either accepted or cancelled.
 * (Accepted = the user accepted selected values, Cancelled = hide() is called or Esc is pressed)
 *
 * @param picker The picker to prompt the user with
 * @param onDidTriggerButton Optional event to trigger when the picker encounters a "Button Pressed" event.
 *  Buttons do not automatically cancel/accept the picker, caller must explicitly do this if intended.
 *
 * @returns If the picker was cancelled, undefined is returned. Otherwise, an array of the selected items is returned.
 */
export async function promptUser<T extends vscode.QuickPickItem>(
    {
        picker,
        onDidTriggerButton,
    }: {
        picker: vscode.QuickPick<T>,
        onDidTriggerButton?(
            button: vscode.QuickInputButton,
            resolve: (value: T[] | PromiseLike<T[] | undefined> | undefined) => void,
            reject: (reason?: any) => void,
        ): void,
    }
): Promise<T[] | undefined> {

    const disposables: vscode.Disposable[] = []

    try {
        const response = await new Promise<T[] | undefined>((resolve, reject) => {

            picker.onDidAccept(
                () => {
                    resolve(Array.from(picker.selectedItems))
                },
                picker,
                disposables)

            picker.onDidHide(
                () => {
                    resolve(undefined)
                },
                picker,
                disposables)

            if (onDidTriggerButton) {
                picker.onDidTriggerButton(
                    (btn: vscode.QuickInputButton) => onDidTriggerButton(btn, resolve, reject),
                    picker,
                    disposables
                )
            }

            picker.show()
        })

        return response
    } finally {
        disposables.forEach(d => d.dispose() as void)
        picker.hide()
    }
}

/**
 * Convenience method to allow the QuickPick to be treated more like a dialog.
 * Unlike promptUser, this accepts an externally-generated Promise that will fill the QuickPick
 *
 * NB: an externally-generated Promise is used because this function only needs to know when it's done.
 * This function should populate the picker externally.
 * That way, the function has access to functionality from its own class/file.
 * If this promise should fail, it is the function's responsibility to populate the quick pick with an error message.
 *
 * This method shows a busy sign, then shows the picker with loaded values,
 * and returns after the picker is either accepted or cancelled.
 * (Accepted = the user accepted selected values, Cancelled = hide() is called or Esc is pressed)
 *
 * @param picker The picker to prompt the user with
 * @param populator A Promise resolved externally that is tied to a function that will fill the QuickPick's items
 *  Should resolve upon successfully filling the QuickPick.
 * @param onDidTriggerButton Optional event to trigger when the picker encounters a "Button Pressed" event.
 *  Buttons do not automatically cancel/accept the picker, caller must explicitly do this if intended.
 *
 * @returns If the picker was cancelled, undefined is returned. Otherwise, an array of the selected items is returned.
 */
export async function promptUserWithBusyMessage<T extends vscode.QuickPickItem>(
    {
        picker,
        populator,
        onDidTriggerButton,
    }: {
        picker: vscode.QuickPick<T>,
        populator: Promise<void>,
        onDidTriggerButton?(
            button: vscode.QuickInputButton,
            resolve: (value: T[] | PromiseLike<T[] | undefined> | undefined) => void,
            reject: (reason?: any) => void,
        ): void,
    }
): Promise<T[] | undefined> {
    const disposables: vscode.Disposable[] = []

    return await new Promise<boolean>(async (resolve, reject) => {
        picker.onDidHide(
            () => {
                resolve(false)
            },
            picker,
            disposables)

        makeQuickPickBusy(picker)
        picker.show()

        await populator
        resolve(true)
    }).then((didComplete) => {
        // promise completed, external function finished list handling
        if (didComplete) {
            makeQuickPickNotBusy(picker)

            return promptUser({ picker, onDidTriggerButton })
        // picker.hide() was called one way or another--implies user cancelled the quick pick
        } else {
            disposables.forEach(d => d.dispose() as void)

            return undefined
        }
    })
}

export function verifySinglePickerOutput<T extends vscode.QuickPickItem>(
    choices: T[] | undefined
): T | undefined {
    const logger = getLogger()
    if (!choices || choices.length === 0) {
        return undefined
    }

    if (choices.length > 1) {
        logger.warn(
            `Received ${choices.length} responses from user, expected 1.` +
            ' Cancelling to prevent deployment of unexpected template.'
        )

        return undefined
    }

    return choices[0]
}

export function makeQuickPickBusy(quickPick: vscode.QuickPick<vscode.QuickPickItem>): void {
    quickPick.enabled = false
    quickPick.busy = true
}

export function makeQuickPickNotBusy(quickPick: vscode.QuickPick<vscode.QuickPickItem>): void {
    quickPick.enabled = true
    quickPick.busy = false
}
