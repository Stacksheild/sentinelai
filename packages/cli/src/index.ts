#!/usr/bin/env node

import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";
import { costCommand } from "./commands/cost.js";
import { routeCommand } from "./commands/route.js";

const program = new Command()
  .name("sentinelai")
  .description("AI ecosystem security scanner, cost tracker, and model router")
  .version("0.1.0");

program.addCommand(scanCommand);
program.addCommand(costCommand);
program.addCommand(routeCommand);

program.parse();
