import{go as a}from"./site-9g6k7hsp.js";import{mt as o}from"./site-bab0thfc.js";import{fG as s}from"./site-pcap36fe.js";class p extends a{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",o)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}s("FlowGraphKeyDownEventBlock",p);
export{p as fo};

//# debugId=4610A32A5376746964756E2164756E21
//# sourceMappingURL=site-hh6ty8b5.js.map
