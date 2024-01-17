import { SlideProperty } from "./slide";

export const SLIDE_PROPERTIES: Record<string, SlideProperty> = {
    device_name: {
        parse: (data: any) => data.device_name,
        definition: "name"
    },
    curtain_type: {
        parse: (data: any) => data.curtain_type,
        definition: {
            type: "string",
            label: "Curtain Type",
            group: "meta"
        }
    },
    slide_setup: {
        parse: (data: any) => data.slide_setup,
        definition: {
            type: "string",
            label: "Slide Setup",
            group: "meta"
        }
    },
    pos: {
        url: "position",
        parse: (data: any) => data.device_info.pos,
        definition: {
            '@type': "level",
            type: "number",
            label: "Position",
            min: 0,
            max: 1
        }
    },
}
