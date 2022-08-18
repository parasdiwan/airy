package endpoints

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/airyhq/airy/infrastructure/controller/pkg/cache"
	"github.com/airyhq/airy/lib/go/k8s"
	"github.com/airyhq/airy/lib/go/payloads"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog"
)

type ComponentsUpdate struct {
	DeployedCharts *cache.DeployedCharts
	clientSet      *kubernetes.Clientset
	namespace      string
}

func (s *ComponentsUpdate) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	var requestComponents payloads.ComponentsUpdateRequestPayload

	err = json.Unmarshal(body, &requestComponents)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	responseComponents := payloads.ComponentsUpdateResponsePayload{}
	responseComponents.Components = make(map[string]bool)

	for _, component := range requestComponents.Components {
		componentInstalled, err := s.isComponentInstalled(component.Name)
		if err != nil {
			klog.Error("Unable to retrieve the status of the component:" + component.Name + "\nError:\n" + err.Error())
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if !componentInstalled {
			klog.Error("Trying to apply configuration for a component that is not installed: " + component.Name)
			continue
		}

		labels := map[string]string{
			"core.airy.co/component": component.Name,
		}
		annotations := map[string]string{
			"core.airy.co/enabled": strconv.FormatBool(component.Enabled),
		}
		err = k8s.ApplyConfigMap(component.Name, s.namespace, payloads.ToCamelCase(component.Data), labels, annotations, s.clientSet, r.Context())
		if err != nil {
			klog.Error("Unable to apply configuration for component:" + component.Name + "\nError:\n" + err.Error())
			responseComponents.Components[component.Name] = false
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		} else {
			responseComponents.Components[component.Name] = true
		}
	}

	resp, _ := json.Marshal(responseComponents)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(resp)
}

//NOTE: Prevent the upload of a configmap if the component is not present
func (s *ComponentsUpdate) isComponentInstalled(configName string) (bool, error) {
	deployedCharts, err := k8s.GetInstalledComponents(context.TODO(), s.namespace, s.clientSet)
	if err != nil {
		klog.Error("Unable to get installed components:\n" + err.Error())
		return false, err
	}
	return deployedCharts[configName], nil
}
