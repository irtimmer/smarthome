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
    pos: {
        url: "Slide.SetPos",
        parse: (data: any) => data.pos,
        definition: {
            '@type': "level",
            type: "number",
            label: "Position",
            min: 0,
            max: 1
        }
    },
}
