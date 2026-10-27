import{Ye}from"./site-v7dfb6ky.js";import{ct}from"./site-fn6dg0m5.js";var l="cachedOperationValue",t="cachedExecutionId";class fr extends Ye{constructor(e,i){super(i);this.value=this.registerDataOutput("value",e),this.isValid=this.registerDataOutput("isValid",ct)}_updateOutputs(e){let i=e._getExecutionVariable(this,t,-1),s=e._getExecutionVariable(this,l,null);if(s!==void 0&&s!==null&&i===e.executionId)this.isValid.setValue(!0,e),this.value.setValue(s,e);else try{let a=this._doOperation(e);if(a===void 0||a===null){this.isValid.setValue(!1,e);return}e._setExecutionVariable(this,l,a),e._setExecutionVariable(this,t,e.executionId),this.value.setValue(a,e),this.isValid.setValue(!0,e)}catch(a){this.isValid.setValue(!1,e)}}}
export{fr};

//# debugId=8427DDE8A064488C64756E2164756E21
//# sourceMappingURL=site-qb4nmqee.js.map
