import{En as H}from"./site-04bvvapf.js";import{nu as A}from"./site-v2rprchq.js";import{sE as z}from"./site-c9kedmgh.js";class J extends H{constructor(m){super(m);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",A)}_executeEvent(m,q){let u=q.event.repeat??!1;if(u&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(u,m),super._executeEvent(m,q)}getClassName(){return"FlowGraphKeyDownEventBlock"}}z("FlowGraphKeyDownEventBlock",J);
export{J as Cn};

//# debugId=684057752B52D35164756E2164756E21
//# sourceMappingURL=site-smd0aqx3.js.map
