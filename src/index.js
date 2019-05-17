#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const shell = require('shelljs')

const [, , command, ...flags] = process.argv
const validCommands = ['deploy', 'remove', 'invoke']
const args = {
  stack: getValue('--stack'),
  stage: getStage(),
  stacks: [],
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
 * Execute a serverless command.
 * @param {string} stackName The name of the stack.
 * @param  {string[]} args The command line arguments.
 */
function execute(stackName, ...args) {
  const stackPath = path.resolve(stackName)
  if (!fs.existsSync(stackPath)) {
    console.error(`The folder "${stackPath}" don't exists.`)
    return
  }

  console.log(`\n\n\x1b[33mExecuting commanding in the stack: \x1b[0m${stackName}\n\n`)
  shell.cd(stackName.trim())
  shell.exec(`sls ${args.join(' ')} --colors always`)
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
    console.error(`Multi Stack Serverless CLI can't resolve the command: ${command}`)
    return true
  }

  if (!args.stage) {
    console.error('You must set a stage to deploy to the corresponding .env file.')
    return true
  }

  if (!fs.existsSync(path.resolve(`.env.${args.stage}`))) {
    console.error(`No env file present for the current environment: ${args.stage}`)
    return true
  }

  return false
}

/**
 * Execute the commands.
 */
function executeCommands() {
  if (args.stack) {
    removeFlag('--stack')
    execute(args.stack, command, flags)
    return
  }
  
  require('custom-env').env(args.stage)
  
  if (!process.env.STACKS) {
    console.error(`Set STACKS field in the file: .env.${args.stage}`)
    return
  }
  
  args.stacks = process.env.STACKS.split(',')
  
  for (let index = 0; index < args.stacks.length; index++) {
    execute(args.stacks[index], command, flags)
  }
}

if (!haveError())
  executeCommands()
