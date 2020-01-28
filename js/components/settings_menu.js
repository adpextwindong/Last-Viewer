const CONFIG = require("../config");

module.exports = {
    //TODO locales
    locales : {
        en: {

        },
        jp: {
            'English': '英語',
            'Japanese': '日本語',
            'Select language locale': 'Select !TODO',
            'Clear localStorage': 'Clear localStorage !TODO',
        },
    },
    template: `<div id="settings_menu">
        menu interface for storing settings into localStorage etc...

        <div>
            <span>
                {{t('Select language locale')}}
            </span>
            <div>
                <input type="radio" id="en" name="locale" value="en"
                    :checked="isCurrentLocal('en')"
                    v-on:click="setLocale('en')">
                <label for="en">{{t('English')}}</label>
            </div>
        
            <div>
                <input type="radio" id="jp" name="locale" value="jp"
                    :checked="isCurrentLocal('jp')"
                    v-on:click="setLocale('jp')">
                <label for="jp">{{t('Japanese')}}</label>
            </div>
        </div>

        <div>
            <button type="button" v-on:click="clearLocalStorage()">{{t('Clear localStorage')}}</button>
        </div>
    </div>`,
    methods : {
        isCurrentLocal : function(locale){
            let stored = window.localStorage.getItem("locale");
            if(stored === null){
                this.$translate.setLang(CONFIG.DEFAULT_LOCALE);
                window.localStorage.setItem("locale", locale);
            }
            return locale === window.localStorage.getItem("locale");
        },
        setLocale : function(locale){
            if(locale === "en" || locale === "jp"){
                console.log("Setting locale");
                this.$translate.setLang(locale);
                //TODO have this locale prop get fetched on app mount or something
                let ls = window.localStorage;
                ls.setItem("locale", locale);
            }
        },
        clearLocalStorage : function(){
            let ls = window.localStorage;
            ls.clear();
        }

    },
    created(){
        let locale = window.localStorage.getItem("locale");
        if(locale){
            this.$translate.setLang(locale);
        }else{
            this.$translate.setLang(CONFIG.DEFAULT_LOCALE);
        }
    }
    //TODO set the locale via routing too maybe.
    //TODO local storage of setting. Make sure the app on mount fetches any language setting if no routing language is set.
}