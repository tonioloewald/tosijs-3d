import{ct}from"./site-8r8s7x74.js";import{Fl}from"./site-8hfpxy92.js";import{o}from"./site-twypjy9n.js";class Lm extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Lm);
export{Lm};

//# debugId=9CB0A29C914E517F64756E2164756E21
//# sourceMappingURL=site-eh5tswh2.js.map
