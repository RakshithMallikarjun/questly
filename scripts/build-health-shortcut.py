#!/usr/bin/env python3
"""Builds the unsigned "Questly Health" iPhone shortcut.

It reads today's steps and exercise minutes and last night's sleep from
Apple Health and sends them to Questly's Firebase project (health/<key>).

Usage:  python3 scripts/build-health-shortcut.py out/questly-health-unsigned.shortcut
Then sign it on a Mac:
  shortcuts sign --mode anyone --input out/questly-health-unsigned.shortcut \
                 --output public/questly-health.shortcut
"""
import plistlib
import sys
import uuid

PROJECT = 'questly-2a6c9'
API_KEY = 'AIzaSyBe8Jnq7nkbFQhxMvPEX3hrtuULpJ3FbvM'  # public web key, same as src/sync/config.ts
OBJ = '￼'
KEY_FILE = 'questly-key.txt'

actions = []


def uid():
    return str(uuid.uuid4()).upper()


def out(ref, name):
    return {'OutputUUID': ref, 'OutputName': name, 'Type': 'ActionOutput'}


def var(ref, name):
    """A parameter that is a single action output."""
    return {'Value': out(ref, name), 'WFSerializationType': 'WFTextTokenAttachment'}


def text(*parts):
    """A text parameter mixing strings and (uuid, name) outputs or 'DATE'."""
    s, attachments = '', {}
    for p in parts:
        if isinstance(p, str):
            s += p
        else:
            pos = len(s.encode('utf-16-le')) // 2
            attachments[f'{{{pos}, 1}}'] = p
            s += OBJ
    return {'Value': {'string': s, 'attachmentsByRange': attachments}, 'WFSerializationType': 'WFTextTokenString'}


def add(identifier, params, ref=None):
    params = dict(params)
    if ref:
        params['UUID'] = ref
    actions.append({'WFWorkflowActionIdentifier': identifier, 'WFWorkflowActionParameters': params})
    return ref


def find_health(kind, date_filter, sort_oldest=False):
    ref = uid()
    templates = [
        {'Property': 'Type', 'Operator': 4, 'Removable': False, 'Values': {'Enumeration': kind}},
        date_filter,
    ]
    params = {
        'WFContentItemFilter': {
            'Value': {
                'WFActionParameterFilterPrefix': 1,
                'WFContentPredicateBoundedDate': False,
                'WFActionParameterFilterTemplates': templates,
            },
            'WFSerializationType': 'WFContentPredicateTableTemplate',
        },
    }
    if sort_oldest:
        params['WFContentItemSortProperty'] = 'Start Date'
        params['WFContentItemSortOrder'] = 'Oldest First'
    return add('is.workflow.actions.filter.health.quantity', params, ref)


TODAY = {'Property': 'Start Date', 'Operator': 1002, 'Removable': True, 'Values': {'Unit': 16}}  # is today
LAST_DAY = {'Property': 'Start Date', 'Operator': 1001, 'Removable': True, 'Values': {'Number': 1, 'Unit': 16}}  # in the last 1 day


def total(samples, name):
    return add('is.workflow.actions.statistics', {'WFStatisticsOperation': 'Sum', 'WFInput': var(samples, name)}, uid())


# 0-3. Your Questly key. The app's "Connect" button runs this shortcut with the
# key as input; it is saved to iCloud Drive/Shortcuts/questly-key.txt and read
# back on every later run (the automations run without input).
INPUT = {'Value': {'Type': 'ExtensionInput'}, 'WFSerializationType': 'WFTextTokenAttachment'}
group = uid()
add('is.workflow.actions.conditional', {
    'GroupingIdentifier': group, 'WFControlFlowMode': 0, 'WFCondition': 100, 'WFInput': {'Type': 'Variable', 'Variable': INPUT},
})
add('is.workflow.actions.documentpicker.save', {
    'WFInput': INPUT, 'WFAskWhereToSave': False, 'WFSaveFileOverwrite': True,
    'WFFileDestinationPath': KEY_FILE,
}, uid())
add('is.workflow.actions.conditional', {'GroupingIdentifier': group, 'WFControlFlowMode': 2}, uid())
key_file = add('is.workflow.actions.documentpicker.open', {
    'WFGetFilePath': KEY_FILE, 'WFShowFilePicker': False, 'WFFileErrorIfNotFound': True,
}, uid())
key = add('is.workflow.actions.gettext', {'WFTextActionText': text(out(key_file, 'File'))}, uid())
# 1-2. Today's date and day-of-week slot.
day = add('is.workflow.actions.format.date', {
    'WFDateFormatStyle': 'Custom', 'WFDateFormat': 'yyyyMMdd',
    'WFDate': text({'Type': 'CurrentDate'}),
}, uid())
slot = add('is.workflow.actions.format.date', {
    'WFDateFormatStyle': 'Custom', 'WFDateFormat': "'w'c",
    'WFDate': text({'Type': 'CurrentDate'}),
}, uid())
# 3-4. Steps today.
steps_found = find_health('Steps', TODAY)
steps = total(steps_found, 'Health Samples')
# 5-6. Exercise minutes today.
ex_found = find_health('Exercise Minutes', TODAY)
exercise = total(ex_found, 'Health Samples')
# 7-12. Sleep: time from the first to the last sleep sample in the last day.
sleep_found = find_health('Sleep Analysis', LAST_DAY, sort_oldest=True)
first = add('is.workflow.actions.getitemfromlist', {'WFItemSpecifier': 'First Item', 'WFInput': var(sleep_found, 'Health Samples')}, uid())
last = add('is.workflow.actions.getitemfromlist', {'WFItemSpecifier': 'Last Item', 'WFInput': var(sleep_found, 'Health Samples')}, uid())
start = add('is.workflow.actions.properties.health.quantity', {'WFContentItemPropertyName': 'Start Date', 'WFInput': var(first, 'Item from List')}, uid())
end = add('is.workflow.actions.properties.health.quantity', {'WFContentItemPropertyName': 'End Date', 'WFInput': var(last, 'Item from List')}, uid())
sleep = add('is.workflow.actions.gettimebetweendates', {
    'WFTimeUntilUnit': 'Minutes',
    'WFInput': var(end, 'End Date'),
    'WFTimeUntilFromDate': var(start, 'Start Date'),
}, uid())
# 13. Request body (Firestore REST format; values as text so empty is fine).
body = add('is.workflow.actions.gettext', {'WFTextActionText': text(
    '{"fields":{"', out(slot, 'Formatted Date'), '":{"mapValue":{"fields":{',
    '"date":{"stringValue":"', out(day, 'Formatted Date'), '"},',
    '"steps":{"stringValue":"', out(steps, 'Statistics'), '"},',
    '"workoutMinutes":{"stringValue":"', out(exercise, 'Statistics'), '"},',
    '"sleepMinutes":{"stringValue":"', out(sleep, 'Time Between Dates'), '"}',
    '}}}}}',
)}, uid())
# 14. Send it.
add('is.workflow.actions.downloadurl', {
    'WFURL': text(
        f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/health/',
        out(key, 'Text'), f'?key={API_KEY}&updateMask.fieldPaths=', out(slot, 'Formatted Date'),
    ),
    'WFHTTPMethod': 'PATCH',
    'ShowHeaders': True,
    'WFHTTPHeaders': {'Value': {'WFDictionaryFieldValueItems': [{
        'WFItemType': 0,
        'WFKey': text('Content-Type'),
        'WFValue': text('application/json'),
    }]}, 'WFSerializationType': 'WFDictionaryFieldValue'},
    'WFHTTPBodyType': 'File',
    'WFRequestVariable': var(body, 'Text'),
}, uid())
# 15. Let you know.
add('is.workflow.actions.notification', {
    'WFNotificationActionTitle': 'Questly',
    'WFNotificationActionBody': text('Health synced: ', out(steps, 'Statistics'), ' steps'),
    'WFNotificationActionSound': False,
}, uid())

shortcut = {
    'WFWorkflowName': 'Questly Health',
    'WFWorkflowActions': actions,
    'WFWorkflowClientVersion': '2605.0.5',
    'WFWorkflowMinimumClientVersion': 900,
    'WFWorkflowMinimumClientVersionString': '900',
    'WFWorkflowIcon': {'WFWorkflowIconStartColor': 4282601983, 'WFWorkflowIconGlyphNumber': 59511},
    'WFWorkflowImportQuestions': [],
    'WFWorkflowInputContentItemClasses': ['WFStringContentItem'],
    'WFWorkflowOutputContentItemClasses': [],
    'WFWorkflowTypes': [],
    'WFWorkflowHasOutputFallback': False,
    'WFWorkflowHasShortcutInputVariables': True,
    'WFQuickActionSurfaces': [],
}

dest = sys.argv[1] if len(sys.argv) > 1 else 'questly-health-unsigned.shortcut'
with open(dest, 'wb') as f:
    plistlib.dump(shortcut, f, fmt=plistlib.FMT_BINARY)
print(f'Wrote {dest} with {len(actions)} actions')
