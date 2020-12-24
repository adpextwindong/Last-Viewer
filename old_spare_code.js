mesh.material = new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } );
var mesh = this.objs[0].getObjectByName("foot", false);
mesh.material.color.set(0xcccccc);	//.set(new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } ));
mesh.material.ambient.set(0xdddddd);
mesh.material.specular.set(0xffffff);
mesh.material.shininess.set(10);


<!-- <div v-on-clickaway="hideContextMenu" id="context_menu">
    <p @contextmenu.prevent="$refs.menu.open">
        Right click on me
    </p>

    <vue-context ref="menu">
        <li>
            <a @click.prevent="")">
                Option 1
            </a>
        </li>
        <li>
            <a @click.prevent="">
                Option 2
            </a>
        </li>
    </vue-context>
</div> -->


hideContextMenu: function() {
    if(this.context_menu_active){
        this.context_menu_active = false;
        this.context_menu_el.style["left"] = -10000 + "px";
        this.context_menu_el.style["top"] = -10000 + "px";
    }
}
