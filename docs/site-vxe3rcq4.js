import{En as H}from"./site-c10saj4d.js";import{nu as A}from"./site-5mc4escc.js";import{sE as z}from"./site-tvqrtn5a.js";class J extends H{constructor(m){super(m);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",A)}_executeEvent(m,q){let u=q.event.repeat??!1;if(u&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(u,m),super._executeEvent(m,q)}getClassName(){return"FlowGraphKeyDownEventBlock"}}z("FlowGraphKeyDownEventBlock",J);
export{J as Cn};

//# debugId=200CF40F8042031964756E2164756E21
//# sourceMappingURL=site-vxe3rcq4.js.map
