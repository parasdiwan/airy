package co.airy.core.api.components.installer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.ApiResponse;
import io.kubernetes.client.openapi.apis.CoreV1Api;
import io.kubernetes.client.openapi.models.V1Job;

import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import co.airy.log.AiryLoggerFactory;

@Component
public class InstalledComponentsHandler {

    private static final Logger log = AiryLoggerFactory.getLogger(InstallerHandler.class);

    private final ApiClient apiClient;
    private final String namespace;
    private final HelmJobHandler helmJobHandler;

    InstalledComponentsHandler(
            ApiClient apiClient,
            HelmJobHandler helmJobHandler,
            @Value("${kubernetes.namespace}") String namespace) {
        this.apiClient = apiClient;
        this.namespace = namespace;
        this.helmJobHandler = helmJobHandler;
    }

    @Cacheable("installedComponents")
    public Map<String, Boolean> getInstalledComponentsCache() throws Exception {
        return getInstalledComponents();
    }

    @CachePut(value = "installedComponents")
    public Map<String, Boolean> putInstalledComponentsCache() throws Exception {
        return getInstalledComponents();
    }

    private Map<String, Boolean> getInstalledComponents() throws Exception {

        ArrayList<String> cmd = new ArrayList<>();
        cmd.add("sh");
        cmd.add("-c");
        cmd.add(String.format(
                    "helm -n %s list | awk '{print $1}' | tail -n +2",
                    namespace));

        final V1Job job = helmJobHandler.launchHelmJob("helm-installed", cmd);
        final CoreV1Api api = new CoreV1Api(apiClient);

        final String podName = helmJobHandler.waitForCompletedStatus(api, job);

        final ApiResponse<String> response = api.readNamespacedPodLogWithHttpInfo(
                podName,
                job.getMetadata().getNamespace(),
                "",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);

        final Map<String, Boolean> installedComponents = Arrays.asList(response.getData().split("\\n"))
                .stream()
                .collect(Collectors.toMap(e -> e, e -> true));

        if (installedComponents == null) {
            throw new JobEmptyException();
        }

        return installedComponents;
    }
}
