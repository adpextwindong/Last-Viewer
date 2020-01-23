module.exports = {
    //TODO locales
    locales : {
        en: {

        },
        jp: {

        },
    },
    template: `<div>
        menu interface for storing settings into localStorage etc...

        <div>
            <input type="radio" id="en" name="locale" value="en"
                checked v-on:click="setLocale('en')">
            <label for="en">English</label>
        </div>
      
        <div>
            <input type="radio" id="jp" name="locale" value="jp" v-on:click="setLocale('jp')">
            <label for="jp">Japanese</label>
        </div>
    </div>`,
    methods : {
        setLocale : function(locale){
            if(locale === "en" || locale === "jp"){
                console.log("Setting locale");
                this.$translate.setLang(locale);
            }
        }
    }
    //TODO set the locale via routing too maybe.
}