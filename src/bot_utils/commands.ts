export const commands = {
    START:          'start',
    LIST:           'find|l',
    STATS:          'stats',
    ID:             'id',
    TAR:            'tardrive|t',
    COUT:           'count|cnt',
    HELP:           'help|h',
    AUTHORIZE:      'autht|a',
    UNAUTHORIZE:    'unautht|ua',
    RESTART:        'restart|r'
};

export const commandsAfter: any = {
    START:          '$',
    LIST:           ' (.+)',
    STATS:          '$',
    ID:             '$',
    TAR:            ' (.+)',
    COUT:           ' (.+)',
    HELP:           '$',
    AUTHORIZE:      '$',
    UNAUTHORIZE:    '$',
    RESTART:        '$'
};
