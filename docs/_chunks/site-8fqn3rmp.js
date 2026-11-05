import{ct}from"./site-fszd7aez.js";import{Fl}from"./site-2nbqdz31.js";import{o}from"./site-9mf4pzsy.js";class Am extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Am);
export{Am};

//# debugId=095B4F9906A01A3F64756E2164756E21
//# sourceMappingURL=site-8fqn3rmp.js.map
