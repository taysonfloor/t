export const commands = {
    START:          'start',
    LIST:           'list|l',
    STATS:          'stats',
    ID:             'id',
    TAR:            'tar|t',
    COUT:           'count|cnt',
    HELP:           'help|h',
    AUTHORIZE:      'authorize|a',
    UNAUTHORIZE:    'unauthorize|ua',
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