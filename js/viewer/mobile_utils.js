module.exports = {
    hideAddressBarOnMobile(){
        // This should hide the address bar on mobile.
        window.addEventListener("load",function() {
            setTimeout(function(){
                window.scrollTo(0, 1);
            }, 0);
        });
    }
}