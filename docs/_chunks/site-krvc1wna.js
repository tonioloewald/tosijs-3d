import{Ts as s}from"./site-nv8skz8z.js";import{lt as i}from"./site-bab0thfc.js";import{fG as o}from"./site-pcap36fe.js";class u extends s{constructor(t){super(t);this.count=this.registerDataOutput("count",i),this.reset=this._registerSignalInput("reset")}_execute(t,l){if(l===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function a(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",u)}a();
export{u as ep,a as fp};

//# debugId=736E7BE68985341664756E2164756E21
//# sourceMappingURL=site-krvc1wna.js.map
