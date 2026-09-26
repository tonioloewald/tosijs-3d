import{Ye,ka,oi}from"./site-5tw2831p.js";import{I}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class am extends Ye{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",I,NaN),this.default=this.registerDataInput("default",I),this.value=this.registerDataOutput("value",I);let s=this.config.cases||[];for(let t of s){if(t=oi(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,I))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(ka(s))t=this._getOutputValueForCase(oi(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var i=!1;function om(){if(i)return;i=!0,a("FlowGraphDataSwitchBlock",am)}om();
export{am,om};

//# debugId=6FB11FEB074E1B2964756E2164756E21
//# sourceMappingURL=site-ajw1yze3.js.map
