import APP_SETTINGS from "../app_settings";

export default {
    locales : {
        en: {

        },
        jp: {
            'English': '英語',
            'Japanese': '日本語',
            'Select language locale': '言語選択',
            'Clear localStorage': 'ローカルストレージをクリア',
        },
    },
    template: `<div id="settings_menu">
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

        <div v-if="app_settings.APP_DEBUG">
            <button type="button" v-on:click="clearLocalStorage()">{{t('Clear localStorage')}}</button>
        </div>
    </div>`,
    methods : {
        isCurrentLocal : function(locale){
            let stored = window.localStorage.getItem("locale");
            if(stored === null){
                this.$translate.setLang(APP_SETTINGS.DEFAULT_LOCALE);
                window.localStorage.setItem("locale", locale);
            }
            return locale === window.localStorage.getItem("locale");
        },
        setLocale : function(locale){
            if(locale === "en" || locale === "jp"){
                console.log("Setting locale");
                this.$translate.setLang(locale);
                let ls = window.localStorage;
                ls.setItem("locale", locale);
            }
        },
        clearLocalStorage : function(){
            let ls = window.localStorage;
            ls.clear();
            console.log("local storage cleared");
        }

    },
    computed : {
        app_settings(){
            return APP_SETTINGS
        }
    },
    created(){
        let locale = window.localStorage.getItem("locale");
        if(locale){
            this.$translate.setLang(locale);
        }else{
            this.$translate.setLang(APP_SETTINGS.DEFAULT_LOCALE);
        }
    }
}