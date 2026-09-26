import{Qe}from"./site-z8mqhr1b.js";import{Rt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class n_ extends Qe{constructor(e){super(e);this.config=e;for(let o in this.config.eventData){let t=this.config.eventData[o],n=typeof t.type==="string"?t.type:t.type?.typeName,i=typeof t.type?.serialize==="function"?t.type:Rt(n);t.type=i,this.registerDataInput(o,i,t.value)}}_execute(e){let o=this.config.eventId,t={};for(let n of this.dataInputs)t[n.name]=n.getValue(e);e.configuration.coordinator.notifyCustomEvent(o,t),this.out._activateSignal(e)}serialize(e={}){super.serialize(e);let o={};for(let t in this.config.eventData){let n=this.config.eventData[t];if(o[t]={type:n.type.typeName},n.value!==void 0)o[t].value=n.value}e.config.eventData=o}getClassName(){return"FlowGraphSendCustomEventBlock"}}var r=!1;function a_(){if(r)return;r=!0,a("FlowGraphSendCustomEventBlock",n_)}a_();
export{n_,a_};

//# debugId=199216721C4715FF64756E2164756E21
//# sourceMappingURL=site-awveq4m2.js.map
