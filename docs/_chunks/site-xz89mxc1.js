import{Ye,Uo,li}from"./site-v7dfb6ky.js";import{P}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class hm extends Ye{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",P,NaN),this.default=this.registerDataInput("default",P),this.value=this.registerDataOutput("value",P);let s=this.config.cases||[];for(let t of s){if(t=li(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,P))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Uo(s))t=this._getOutputValueForCase(li(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function dm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",hm)}dm();
export{hm,dm};

//# debugId=62398008B08D4D5C64756E2164756E21
//# sourceMappingURL=site-xz89mxc1.js.map
