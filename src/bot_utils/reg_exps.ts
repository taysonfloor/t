export class RegExps {
  readonly start: RegExp;
  readonly list: RegExp;
  readonly stats: RegExp;
  readonly id: RegExp;
  readonly tar: RegExp;
  readonly count: RegExp;
  readonly help: RegExp;
  readonly authorize: RegExp;
  readonly unauthorize: RegExp;
  readonly restart: RegExp;

  constructor(commands: string[]) {
    this.start = new RegExp(commands[0], 'i');
    this.list = new RegExp(commands[1], 'i');
    this.stats = new RegExp(commands[2], 'i');
    this.id = new RegExp(commands[3], 'i');
    this.tar = new RegExp(commands[4], 'i');
    this.count = new RegExp(commands[5], 'i');
    this.help = new RegExp(commands[6], 'i');
    this.authorize = new RegExp(commands[7], 'i');
    this.unauthorize = new RegExp(commands[8], 'i');
    this.restart = new RegExp(commands[9], 'i');
  }
}