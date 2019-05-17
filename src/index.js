#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const shell = require('shelljs')

const [, , command, ...flags] = process.argv
const validCommands = ['deploy', 'remove', 'invoke']
const data = {
  stack: getValue('--stack'),
  stage: getStage(),
  stacks: [],
  regions: [],
}

/**
 * Get a value of a command line flag.
 * @param {string} flag The command line flag to get the value.
 */
function getValue(flag) {
  if (flags.includes(flag)) {
    const flagIndex = flags.indexOf(flag)
    const valueIndex = flagIndex + 1

    if (flags.length > valueIndex) {
      return flags[valueIndex]
    }
  }
  return undefined
}

/**
 * Remove a value of the command line flags.
 * @param {string} flag The command line flag to remove.
 */
function removeFlag(flag) {
  if (flags.includes(flag)) {
    const flagIndex = flags.indexOf(flag)
    const valueIndex = flagIndex + 1

    if (flags.length > valueIndex) {
      flags.splice(flagIndex, 2)
    }
  }
}

/**
 * Get the stage flag value if have one.
 */
function getStage() {
  let stage = getValue('--stage')

  if (!stage) {
    stage = getValue('-s')
  }

  return stage
}

/**
 * Execute a serverless command in a stack.
 * @param {string} stackName The name of the stack.
 */
function executeOnStack(stackName) {

  const exec = function(commands) {
    console.log(`\n\n\x1b[32mExecuting command in the stack '${stackName}': \x1b[0msls ${commands}\n\n`)
    shell.exec(`sls ${commands} --colors always`)
  }

  const stackPath = path.resolve(stackName)

  if (!fs.existsSync(stackPath)) {
    console.error(`The folder "${stackPath}" don't exists.`)
    return
  }

  shell.cd(stackName.trim())

  let commandsBase = `${command} ${flags.join(' ')}`

  if (process.env.REGIONS) {
    removeFlag('--region')
    data.regions = process.env.REGIONS.split(',')

    for (let index = 0; index < data.regions.length; index++) {
      const region = data.regions[index].trim()
      exec(`${commandsBase} --region ${region}`)
    }
    return
  }

  exec(commandsBase)

  shell.cd('..')
}

/**
 * Check if have a error.
 */
function haveError() {
  if (!shell.which('sls')) {
    shell.echo('\nThis script requires \'Serverless Framework\' globlally.\n\nRun:\nnpm i -g serverless')
    return true
  }

  if (!validCommands.includes(command)) {
    console.error(`Multi Stack Serverless CLI can't resolve the command: ${command == undefined ? '' : command}`)
    return true
  }

  if (!data.stage) {
    console.error('You must set a stage to deploy to the corresponding .env file.')
    return true
  }

  if (!fs.existsSync(path.resolve(`.env.${data.stage}`))) {
    console.error(`No env file present for the current environment: ${data.stage}`)
    return true
  }

  return false
}

/**
 * Execute the commands.
 */
function executeCommands() {
  if (data.stack) {
    removeFlag('--stack')
    executeOnStack(data.stack)
    return
  }

  require('custom-env').env(data.stage)

  if (!process.env.STACKS) {
    console.error(`Set STACKS field in the file: .env.${data.stage}`)
    return
  }

  data.stacks = process.env.STACKS.split(',')

  for (let index = 0; index < data.stacks.length; index++) {
    executeOnStack(data.stacks[index])
  }
}

if (!haveError())
  executeCommands()

module.exports = { haveError, executeCommands }