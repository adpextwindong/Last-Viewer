//This file is to consolidate Engine events that get emmited up to the VueJS layer for observing.

const ENGINE_EVENTS = Object.freeze({
    "scene_graph_change" : "scene_graph_change",
    "scene_graph_component_remove_uuid_request" : "scene_graph_component_remove_uuid_request",
    "viewer_context_menu_position" : "viewer_context_menu_position",

    "contextmenu_selected_uuids": "contextmenu_selected_uuids"
});

export default ENGINE_EVENTS;