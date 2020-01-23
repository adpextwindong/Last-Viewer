module.exports = {
    //TODO locales
    locales : {
        en: {

        },
        jp: {
            //TODO landmark translation and clean up of landmark names
        },
    },
    template : `
        <ul>
            <li v-for="landmark in landmark_group">
                <span v-bind:class="{ active: landmark.isActive }">{{ landmark.description }}</span>
            </li>
        </ul>
    `,
    props: ['landmark_group'],
}