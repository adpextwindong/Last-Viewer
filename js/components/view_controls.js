module.exports = {
    locales : {
        en: {

        },
        jp: {
            'Top View': '上からのビュー',
            'Bottom View': '下からのビュー',
            //TODO REMAINING VIEW TRANSLATIONS
            'Left View': '左からのビュー',
            'Right View': '右からのビュー',
        },
    },
    template : `
    <div id="view_controls">
        <button type="button" v-on:click="engine_interface.view_top()">{{t('Top View')}}</button>
        <button type="button" v-on:click="engine_interface.view_left()">{{t('Left View')}}</button>
        <button type="button" v-on:click="engine_interface.view_right()">{{t('Right View')}}</button>
        <button type="button" v-on:click="engine_interface.view_toe_end()">{{t('Toe End View')}}</button>
        <button type="button" v-on:click="engine_interface.view_heel_end()">{{t('Heel End View')}}</button>
    </div>
    `,
    props: ['engine_interface'],
    name: 'view_controls',
}