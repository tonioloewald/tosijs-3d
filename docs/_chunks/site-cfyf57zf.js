import{ct}from"./site-cb9bs1rv.js";import{Fl}from"./site-bar3eqrf.js";import{o}from"./site-qd2v2bpa.js";class Am extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Am);
export{Am};

//# debugId=095B4F9906A01A3F64756E2164756E21
//# sourceMappingURL=site-cfyf57zf.js.map
