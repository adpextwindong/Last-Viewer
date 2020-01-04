module.exports = {
    template : `
        <ul>
            <li v-for="landmark in landmark_group">
                <span v-bind:class="{ active: landmark.isActive }">{{ landmark.description }}</span>
            </li>
        </ul>
    `,
    props: ['landmark_group'],
}